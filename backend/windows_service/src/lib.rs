//! Provides functionality to run the Abacus server as a Windows service.
//!
//! This crate registers `abacus.exe --service` at the Windows service control manager (SCM).
//! It handles starting the server process, logging the output and responding to SCM requests.
//! Logs are written to `abacus.out.log` and `abacus.err.log` next to the executable. If a
//! previous log file exists, it will be renamed with a timestamp before creating a new log file.
//! If a crash occurs, it will be logged to a separate file with a timestamp.
//!
//! [`install`] registers the service and starts it. Any extra arguments passed will be included
//! on every start.
//! [`uninstall`] stops and removes the service.
//! Both need administrator privileges.
#![cfg(windows)]

use std::{
    ffi::{OsStr, OsString},
    fmt, fs,
    io::{self, Read, Write},
    path::Path,
    process::{Command, Stdio},
    sync::{OnceLock, mpsc},
    thread::{self, JoinHandle},
    time::{Duration, Instant, SystemTime},
};

use windows_service::{
    define_windows_service,
    service::{
        ServiceAccess, ServiceControl, ServiceControlAccept, ServiceErrorControl, ServiceExitCode,
        ServiceInfo, ServiceStartType, ServiceState, ServiceStatus, ServiceType,
    },
    service_control_handler::{self, ServiceControlHandlerResult, ServiceStatusHandle},
    service_dispatcher,
    service_manager::{ServiceManager, ServiceManagerAccess},
};

const SERVICE_NAME: &str = "Abacus";
const SERVICE_DISPLAY_NAME: &str = "Abacus service";
const SERVICE_DESCRIPTION: &str = "Windows service running the Abacus server";
const SERVICE_TYPE: ServiceType = ServiceType::OWN_PROCESS;

/// Polling interval for the server process status check.
const SERVER_POLL_INTERVAL: Duration = Duration::from_secs(1);
/// How long [`uninstall`] waits for service removal
const UNINSTALL_TIMEOUT: Duration = Duration::from_secs(5);

/// Windows error code for a service that does not exist
const ERROR_SERVICE_DOES_NOT_EXIST: u32 = 1060;

#[derive(Debug)]
pub enum Error {
    Service(windows_service::Error),
    Io(io::Error),
}

impl fmt::Display for Error {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Error::Service(windows_service::Error::Winapi(e)) => {
                write!(f, "Windows API error: {e}")
            }
            Error::Service(e) => write!(f, "{e}"),
            Error::Io(e) => write!(f, "I/O error: {e}"),
        }
    }
}

impl From<windows_service::Error> for Error {
    fn from(err: windows_service::Error) -> Self {
        Error::Service(err)
    }
}

impl From<io::Error> for Error {
    fn from(err: io::Error) -> Self {
        Error::Io(err)
    }
}

/// Command line arguments for the server process.
static SERVER_ARGUMENTS: OnceLock<Vec<OsString>> = OnceLock::new();

/// Run as a Windows service with given arguments.
pub fn run(server_arguments: Vec<OsString>) -> Result<(), Error> {
    SERVER_ARGUMENTS.set(server_arguments).expect("already set");

    // A service has no console to report panics on, so write them to a file instead
    std::panic::set_hook(Box::new(|info| log_crash(&info.to_string())));

    service_dispatcher::start(SERVICE_NAME, ffi_service_main)?;
    Ok(())
}

// Generates the windows service boilerplate named `ffi_service_main`.
// It parses the service arguments and passes them to `service_main`.
define_windows_service!(ffi_service_main, service_main);

// Service entry function which is called on background thread by the system with service
// parameters. There is no stdout or stderr at this point so make sure to configure the log
// output to file if needed.
fn service_main(_arguments: Vec<OsString>) {
    if let Err(error) = run_service() {
        log_crash(&format!("{error}\n\n{error:#?}"));
    }
}

/// Run the server until a stop request is received or the server exits by itself.
fn run_service() -> Result<(), Error> {
    // Create a channel to be able to poll a stop event from the service worker loop.
    let (stop_tx, stop_rx) = mpsc::channel();

    // Define system service event handler that will be receiving service events.
    let event_handler = move |control_event| match control_event {
        // Notifies a service to report its current status information to the service
        // control manager. Always return NoError even if not implemented.
        ServiceControl::Interrogate => ServiceControlHandlerResult::NoError,
        ServiceControl::Stop | ServiceControl::Shutdown => {
            let _ = stop_tx.send(());
            ServiceControlHandlerResult::NoError
        }
        _ => ServiceControlHandlerResult::NotImplemented,
    };

    // Register system service event handler.
    // The returned status handle should be used to report service status changes to the system.
    let status_handle = service_control_handler::register(SERVICE_NAME, event_handler)?;

    match run_server(status_handle, &stop_rx) {
        Ok(exit_code) => report_status(status_handle, ServiceState::Stopped, exit_code),
        Err(error) => {
            report_status(
                status_handle,
                ServiceState::Stopped,
                ServiceExitCode::ServiceSpecific(1),
            )?;
            Err(error)
        }
    }
}

/// Starts the server process.
fn run_server(
    status_handle: ServiceStatusHandle,
    stop_rx: &mpsc::Receiver<()>,
) -> Result<ServiceExitCode, Error> {
    let current_exe = std::env::current_exe()?;
    let server_arguments = SERVER_ARGUMENTS
        .get()
        .expect("should be set before the service is started");

    let stdout_log = create_log(&current_exe, "out")?;
    let stderr_log = create_log(&current_exe, "err")?;

    let mut server = Command::new(&current_exe)
        .args(server_arguments)
        // A service starts in the Windows system directory.
        // Set current directory to the executable's directory.
        .current_dir(
            current_exe
                .parent()
                .expect("path should have a parent directory"),
        )
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()?;
    let stdout_thread = copy_to_log(
        server.stdout.take().expect("stdout should be piped"),
        stdout_log,
    );
    let stderr_thread = copy_to_log(
        server.stderr.take().expect("stderr should be piped"),
        stderr_log,
    );

    report_status(
        status_handle,
        ServiceState::Running,
        ServiceExitCode::NO_ERROR,
    )?;

    let exit_code = loop {
        if let Some(exit_status) = server.try_wait()? {
            // The server exited by itself: report its exit code, so that the failure is visible
            // in the service status
            break match exit_status.code() {
                Some(0) => ServiceExitCode::NO_ERROR,
                Some(code) => ServiceExitCode::ServiceSpecific(code.cast_unsigned()),
                None => ServiceExitCode::ServiceSpecific(1),
            };
        }

        match stop_rx.recv_timeout(SERVER_POLL_INTERVAL) {
            Err(mpsc::RecvTimeoutError::Timeout) => {}
            Ok(()) | Err(mpsc::RecvTimeoutError::Disconnected) => {
                server.kill()?;
                server.wait()?;
                break ServiceExitCode::NO_ERROR;
            }
        }
    };

    // The server has exited, so its output has ended and the log threads finish
    stdout_thread.join().expect("should not panic")?;
    stderr_thread.join().expect("should not panic")?;

    Ok(exit_code)
}

/// Report the service state
fn report_status(
    status_handle: ServiceStatusHandle,
    current_state: ServiceState,
    exit_code: ServiceExitCode,
) -> Result<(), Error> {
    let controls_accepted = if current_state == ServiceState::Running {
        ServiceControlAccept::STOP | ServiceControlAccept::SHUTDOWN
    } else {
        ServiceControlAccept::empty()
    };

    status_handle.set_service_status(ServiceStatus {
        service_type: SERVICE_TYPE,
        current_state,
        controls_accepted,
        exit_code,
        checkpoint: 0,
        wait_hint: Duration::default(),
        process_id: None,
    })?;
    Ok(())
}

/// Create the log file next to the executable. If the file exists,
/// it will be renamed with a timestamp before creating a new log file.
fn create_log(current_exe: &Path, name: &str) -> io::Result<fs::File> {
    let path = current_exe.with_extension(format!("{name}.log"));
    if path.exists() {
        fs::rename(
            &path,
            current_exe.with_extension(format!("{}.{}.log", unix_timestamp(), name)),
        )?;
    }
    fs::File::create(path)
}

/// Copy output to the log file on a background thread
fn copy_to_log(
    mut output: impl Read + Send + 'static,
    mut log: fs::File,
) -> JoinHandle<io::Result<u64>> {
    thread::spawn(move || io::copy(&mut output, &mut log))
}

/// Write a crash report to a new file next to the executable.
fn log_crash(text: &str) {
    let Ok(current_exe) = std::env::current_exe() else {
        return;
    };
    let path = current_exe.with_extension(format!("{}.crash.log", unix_timestamp()));

    if let Ok(mut file) = fs::File::create(path) {
        let _ = writeln!(file, "{text}");
    }
}

/// Gets unix timestamp in seconds
fn unix_timestamp() -> u64 {
    SystemTime::now()
        .duration_since(SystemTime::UNIX_EPOCH)
        .map_or(0, |since_epoch| since_epoch.as_secs())
}

/// Install and start the Windows service. Given `launch_arguments` will be used every time
/// the service is started. The service runs under the LocalSystem account and starts automatically
/// when Windows boots.
pub fn install(launch_arguments: Vec<OsString>) -> Result<(), Error> {
    let service_manager = ServiceManager::local_computer(
        None::<&str>,
        ServiceManagerAccess::CONNECT | ServiceManagerAccess::CREATE_SERVICE,
    )?;

    let service_info = ServiceInfo {
        name: SERVICE_NAME.into(),
        display_name: SERVICE_DISPLAY_NAME.into(),
        service_type: SERVICE_TYPE,
        start_type: ServiceStartType::AutoStart,
        error_control: ServiceErrorControl::Normal,
        executable_path: std::env::current_exe()?,
        launch_arguments,
        dependencies: vec![],
        // Run as LocalSystem
        account_name: None,
        account_password: None,
    };

    let service = service_manager.create_service(
        &service_info,
        ServiceAccess::CHANGE_CONFIG | ServiceAccess::START,
    )?;
    service.set_description(SERVICE_DESCRIPTION)?;
    service.start::<&OsStr>(&[])?;

    println!("Installed and started the Windows service \"{SERVICE_NAME}\"");
    Ok(())
}

/// Stops and uninstalls the Windows service.
pub fn uninstall() -> Result<(), Error> {
    let service_manager =
        ServiceManager::local_computer(None::<&str>, ServiceManagerAccess::CONNECT)?;
    let service = service_manager.open_service(
        SERVICE_NAME,
        ServiceAccess::QUERY_STATUS | ServiceAccess::STOP | ServiceAccess::DELETE,
    )?;

    // The service will be marked for deletion, however it will not be deleted
    // until it is stopped and all open handles to it are closed.
    service.delete()?;
    if service.query_status()?.current_state != ServiceState::Stopped {
        // If the service cannot be stopped, it will be deleted when the system restarts.
        service.stop()?;
    }
    // Explicitly close our open handle to the service
    drop(service);

    // There is no way to wait for the removal, so poll for it
    let start = Instant::now();
    while start.elapsed() < UNINSTALL_TIMEOUT {
        if let Err(windows_service::Error::Winapi(error)) =
            service_manager.open_service(SERVICE_NAME, ServiceAccess::QUERY_STATUS)
            && error.raw_os_error() == Some(ERROR_SERVICE_DOES_NOT_EXIST.cast_signed())
        {
            println!("Uninstalled the Windows service \"{SERVICE_NAME}\"");
            return Ok(());
        }
        thread::sleep(Duration::from_secs(1));
    }

    println!(
        "The Windows service \"{SERVICE_NAME}\" is marked for deletion and is removed once it has stopped"
    );
    Ok(())
}

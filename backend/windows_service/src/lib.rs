#![cfg(windows)]
//! Provides functionality to run the Abacus server as a Windows service.
//!
//! This crate registers `abacus.exe --service` at the Windows service control manager (SCM).
//! The service runs as the LocalService account, data will be stored in `%ProgramData%\Abacus`.
//!
//! The server logs to `abacus.log` inside the `logs` folder. If a previous log file exists,
//! it will be renamed with a timestamp before creating a new log file.
//! If a crash occurs, it will be logged to a separate file with a timestamp.
//!
//! [`install`] registers the service and starts it. Any extra arguments passed will be included
//! on every start.
//! [`uninstall`] stops and removes the service.
//! Both need administrator privileges.

use std::{
    ffi::{OsStr, OsString},
    fmt, fs,
    future::Future,
    io::{self, Write},
    path::PathBuf,
    pin::Pin,
    sync::{Arc, OnceLock},
    thread,
    time::{Duration, Instant, SystemTime},
};

use tokio::sync::Notify;
use windows_service::{
    define_windows_service,
    service::{
        ServiceAccess, ServiceAction, ServiceActionType, ServiceControl, ServiceControlAccept,
        ServiceErrorControl, ServiceExitCode, ServiceFailureActions, ServiceFailureResetPeriod,
        ServiceInfo, ServiceStartType, ServiceState, ServiceStatus, ServiceType,
    },
    service_control_handler::{self, ServiceControlHandlerResult, ServiceStatusHandle},
    service_dispatcher,
    service_manager::{ServiceManager, ServiceManagerAccess},
};

const SERVICE_NAME: &str = "Abacus";
const SERVICE_ACCOUNT: &str = r"NT AUTHORITY\LocalService";
const SERVICE_DISPLAY_NAME: &str = "Abacus service";
const SERVICE_DESCRIPTION: &str = "Windows service running the Abacus server";
const SERVICE_TYPE: ServiceType = ServiceType::OWN_PROCESS;

/// How long the SCM should wait for the server to shut down gracefully after a stop request
const STOP_WAIT_HINT: Duration = Duration::from_secs(15);
/// How long [`uninstall`] waits for service removal, should be longer than the stop wait hint.
const UNINSTALL_TIMEOUT: Duration = Duration::from_secs(20);

/// If the service stops unexpectedly, it is restarted after this delay. After the last one, it stays stopped.
const RESTART_DELAYS: [Duration; 3] = [
    Duration::from_secs(5),
    Duration::from_secs(10),
    Duration::from_secs(30),
];
/// After the failure actions, the failure count is reset after this period.
const FAILURE_RESET_PERIOD: Duration = Duration::from_secs(24 * 60 * 60);

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

/// Signal to shut the server down, which completes when the SCM asks the service to stop.
pub type ShutdownSignal = Pin<Box<dyn Future<Output = ()> + Send>>;

/// The function that runs the server. Set by [`run`] before the SCM calls [`service_main`].
static RUN_SERVER: OnceLock<fn(ShutdownSignal) -> bool> = OnceLock::new();

/// Store the given server function so that it can be called by the service main function.
pub fn run(run_server: fn(ShutdownSignal) -> bool) -> Result<(), Error> {
    let _ = RUN_SERVER.set(run_server);

    // A service starts in the Windows system directory.
    // Set current directory to the data directory.
    let data_dir = data_dir()?;
    fs::create_dir_all(&data_dir)?;
    std::env::set_current_dir(&data_dir)?;

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

/// Run the server until it SCM requests to stop it or it stops by itself.
fn run_service() -> Result<(), Error> {
    // Notified when the SCM asks the service to stop
    let stop = Arc::new(Notify::new());

    // Define system service event handler that will be receiving service events.
    let event_handler = {
        let stop = Arc::clone(&stop);
        move |control_event| match control_event {
            // Notifies a service to report its current status information to the service
            // control manager. Always return NoError even if not implemented.
            ServiceControl::Interrogate => ServiceControlHandlerResult::NoError,
            ServiceControl::Stop | ServiceControl::Shutdown => {
                stop.notify_one();
                ServiceControlHandlerResult::NoError
            }
            _ => ServiceControlHandlerResult::NotImplemented,
        }
    };

    // Register system service event handler.
    // The returned status handle should be used to report service status changes to the system.
    let status_handle = service_control_handler::register(SERVICE_NAME, event_handler)?;

    report_status(
        status_handle,
        ServiceState::Running,
        ServiceExitCode::NO_ERROR,
    )?;

    let stop_requested = Box::pin(async move {
        stop.notified().await;
        // Shutting down gracefully takes a while, so tell the SCM to wait for it
        let _ = report_status(
            status_handle,
            ServiceState::StopPending,
            ServiceExitCode::NO_ERROR,
        );
    });
    let run_server = RUN_SERVER
        .get()
        .expect("should be set before the service is started");

    // Run the server and pass the ShutdownSignal to it.
    let exit_code = if run_server(stop_requested) {
        ServiceExitCode::NO_ERROR
    } else {
        ServiceExitCode::ServiceSpecific(1)
    };

    report_status(status_handle, ServiceState::Stopped, exit_code)
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
    let wait_hint = if current_state == ServiceState::StopPending {
        STOP_WAIT_HINT
    } else {
        Duration::default()
    };

    status_handle.set_service_status(ServiceStatus {
        service_type: SERVICE_TYPE,
        current_state,
        controls_accepted,
        exit_code,
        checkpoint: 0,
        wait_hint,
        process_id: None,
    })?;
    Ok(())
}

/// Create the log file in the logs directory. If the file exists,
/// it will be renamed with a timestamp before creating a new log file.
pub fn create_log_file() -> Result<fs::File, Error> {
    let dir: PathBuf = logs_dir()?;
    fs::create_dir_all(&dir)?;

    let path = dir.join(format!("{}.log", SERVICE_NAME.to_lowercase()));
    if path.exists() {
        fs::rename(
            &path,
            dir.join(format!(
                "{}.{}.log",
                SERVICE_NAME.to_lowercase(),
                unix_timestamp()
            )),
        )?;
    }
    Ok(fs::File::create(path)?)
}

/// Folder which contains the service data: `%ProgramData%\Abacus`
/// The current dir for the service process is set to this folder.
fn data_dir() -> Result<PathBuf, Error> {
    let path = std::env::var_os("ProgramData").ok_or_else(|| {
        io::Error::new(
            io::ErrorKind::NotFound,
            "the ProgramData environment variable is not set",
        )
    })?;
    Ok(PathBuf::from(path).join(SERVICE_NAME))
}

fn logs_dir() -> Result<PathBuf, Error> {
    Ok(data_dir()?.join("logs"))
}

/// Write a crash report to a new file in the logs directory.
fn log_crash(text: &str) {
    let Ok(dir) = logs_dir() else {
        return;
    };
    let path = dir.join(format!("{}.crash.log", unix_timestamp()));

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
/// the service is started. The service runs under the LocalService account and starts automatically
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
        account_name: Some(SERVICE_ACCOUNT.into()),
        account_password: None,
    };

    let service = service_manager.create_service(
        &service_info,
        ServiceAccess::CHANGE_CONFIG | ServiceAccess::START,
    )?;
    service.set_description(SERVICE_DESCRIPTION)?;
    service.start::<&OsStr>(&[])?;

    // Restart the service according to the defined actions when it stops unexpectedly.
    // After it runs through all the defined restart actions, it will stay stopped.
    service.update_failure_actions(ServiceFailureActions {
        reset_period: ServiceFailureResetPeriod::After(FAILURE_RESET_PERIOD),
        reboot_msg: None,
        command: None,
        actions: Some(
            RESTART_DELAYS
                .iter()
                .map(|&delay| ServiceAction {
                    action_type: ServiceActionType::Restart,
                    delay,
                })
                .chain([ServiceAction {
                    action_type: ServiceActionType::None,
                    delay: Duration::ZERO,
                }])
                .collect(),
        ),
    })?;
    // Count a stop with error code as a failure
    service.set_failure_actions_on_non_crash_failures(true)?;

    println!("Installed and started the Windows service \"{SERVICE_NAME}\"");
    Ok(())
}

/// Stop and uninstall the Windows service. Leave the data folder as-is.
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

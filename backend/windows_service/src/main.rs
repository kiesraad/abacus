#[cfg(windows)]
fn main() {
    abacus_service::run()
}

#[cfg(not(windows))]
fn main() {
    panic!("This program is only intended to run on Windows.");
}

#[cfg(windows)]
mod abacus_service {
    use std::{
        ffi::OsString,
        io::Write,
        process::{Command, Stdio},
        sync::mpsc,
        time::{Duration, SystemTime},
    };
    use windows_service::{
        Result, define_windows_service,
        service::{
            ServiceControl, ServiceControlAccept, ServiceExitCode, ServiceState, ServiceStatus,
            ServiceType,
        },
        service_control_handler::{self, ServiceControlHandlerResult},
        service_dispatcher,
    };

    const SERVICE_NAME: &str = "abacus_service";
    const SERVICE_TYPE: ServiceType = ServiceType::OWN_PROCESS;

    fn log_crash_to_file(text: &str) {
        // TODO: clean up?
        let timestamp = SystemTime::now()
            .duration_since(SystemTime::UNIX_EPOCH)
            .expect("current time should be after unix epoch")
            .as_secs();

        let mut out_file = std::fs::File::create(
            std::env::current_exe()
                .expect("the executable should be able to determine its path")
                .with_added_extension(format!("{timestamp}.crash.log")),
        )
        .expect("crash file should be openable");

        writeln!(out_file, "{text}").expect("the crash file should be writable");
    }

    pub fn run() {
        std::panic::set_hook(Box::new(|info| {
            log_crash_to_file(&format!("{info}"));
        }));

        // Register generated `ffi_service_main` with the system and start the service, blocking
        // this thread until the service is stopped.
        if let Err(error) = service_dispatcher::start(SERVICE_NAME, ffi_service_main) {
            log_crash_to_file(&format!("{error:#?}"));
        }
    }

    // Generate the windows service boilerplate.
    // The boilerplate contains the low-level service entry function (ffi_service_main) that parses
    // incoming service arguments into Vec<OsString> and passes them to user defined service
    // entry (my_service_main).
    define_windows_service!(ffi_service_main, my_service_main);

    // Service entry function which is called on background thread by the system with service
    // parameters. There is no stdout or stderr at this point so make sure to configure the log
    // output to file if needed.
    pub fn my_service_main(_arguments: Vec<OsString>) {
        if let Err(error) = run_service() {
            log_crash_to_file(&format!("{error:#?}"));
        }
    }

    pub fn run_service() -> Result<()> {
        // Create a channel to be able to poll a stop event from the service worker loop.
        let (shutdown_tx, shutdown_rx) = mpsc::channel();

        // Define system service event handler that will be receiving service events.
        let event_handler = move |control_event| -> ServiceControlHandlerResult {
            match control_event {
                // Notifies a service to report its current status information to the service
                // control manager. Always return NoError even if not implemented.
                ServiceControl::Interrogate => ServiceControlHandlerResult::NoError,

                // Handle stop
                ServiceControl::Stop => {
                    // If the reciever is closed, that means the process has already stopped
                    let _ = shutdown_tx.send(());

                    ServiceControlHandlerResult::NoError
                }

                // treat the UserEvent as a stop request
                ServiceControl::UserEvent(code) => {
                    if code.to_raw() == 130 {
                        // If the reciever is closed, that means the process has already stopped
                        let _ = shutdown_tx.send(());
                    }
                    ServiceControlHandlerResult::NoError
                }

                _ => ServiceControlHandlerResult::NotImplemented,
            }
        };

        // Register system service event handler.
        // The returned status handle should be used to report service status changes to the system.
        let status_handle = service_control_handler::register(SERVICE_NAME, event_handler)?;

        let current_exe =
            std::env::current_exe().expect("the executable should be able to determine its path");
        let mut command = Command::new(current_exe.with_file_name("abacus.exe"))
            .stdin(Stdio::inherit())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
            .expect("ls command failed to start");

        // Tell the system that service is running
        status_handle.set_service_status(ServiceStatus {
            service_type: SERVICE_TYPE,
            current_state: ServiceState::Running,
            controls_accepted: ServiceControlAccept::STOP,
            exit_code: ServiceExitCode::Win32(0),
            checkpoint: 0,
            wait_hint: Duration::default(),
            process_id: None,
        })?;

        let mut stdout = command.stdout.take().expect("handle present");
        let stdout_thread = std::thread::spawn({
            let current_exe = current_exe.clone();

            move || {
                let mut out_file =
                    std::fs::File::create(current_exe.with_added_extension("out.log"))
                        .expect("out.log can be created");

                std::io::copy(&mut stdout, &mut out_file)
                    .expect("stdout log file should be writable");

                out_file.flush().expect("out.log file should be writable");
            }
        });

        let mut stderr = command.stderr.take().expect("handle present");
        let stderr_thread = std::thread::spawn(move || {
            let mut out_file = std::fs::File::create(current_exe.with_added_extension("err.log"))
                .expect("out.log can be created");

            std::io::copy(&mut stderr, &mut out_file).expect("stderr log file should be writable");

            out_file.flush().expect("out.log should be writable");
        });

        // Continue either upon stop or channel disconnect
        let (Ok(_) | Err(mpsc::RecvError)) = shutdown_rx.recv();

        // Kill the underlying process
        command
            .kill()
            .expect("abacus should be killed successfully");
        command.wait().expect("abacus should be shut down");
        stdout_thread.join().expect("io thread should not panic");
        stderr_thread.join().expect("io thread should not panic");

        // Tell the system that service has stopped.
        status_handle.set_service_status(ServiceStatus {
            service_type: SERVICE_TYPE,
            current_state: ServiceState::Stopped,
            controls_accepted: ServiceControlAccept::empty(),
            exit_code: ServiceExitCode::Win32(0),
            checkpoint: 0,
            wait_hint: Duration::default(),
            process_id: None,
        })?;

        Ok(())
    }
}

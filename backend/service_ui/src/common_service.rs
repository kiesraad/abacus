use crate::systemd_service;
use crate::windows_service_wrapper;
pub trait Service {
    fn is_running(&self) -> ServiceState;
    fn start(&self);

    fn restart(&self);

    fn stop(&self);
}

#[derive(Debug)]
pub enum ServiceError {
    #[cfg(windows)]
    WindowsError(windows_service::Error),
    LinuxError(std::io::Error),
}

#[derive(Debug)]
pub enum ServiceState {
    Stopped,
    StartPending,
    StopPending,
    Running,
    ContinuePending,
    PausePending,
    Paused,
}

pub fn new_service() -> Result<Box<dyn Service>, ServiceError> {
    return match std::env::consts::OS {
        "linux" => {
            return match systemd_service::SystemdService::new() {
                Ok(service) => Ok(Box::new(service)),
                Err(err) => Err(err),
            };
        }
        #[cfg(windows)]
        "windows" => {
            return match windows_service_wrapper::new() {
                Ok(service) => Ok(Box::new(service)),
                Err(err) => Err(err),
            };
        }
        _ => {
            panic!("Only Windows and Linux supported.")
        }
    };
}

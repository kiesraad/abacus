use std::error::Error;

#[cfg(unix)]
mod systemd;
#[cfg(windows)]
mod windows;

pub trait Service {
    fn status(&self) -> Result<ServiceState, Box<dyn Error>>;
    fn start(&self) -> Result<(), Box<dyn Error>>;
    fn stop(&self) -> Result<(), Box<dyn Error>>;
}

#[derive(Debug)]
#[cfg_attr(unix, expect(unused))]
pub enum ServiceState {
    Stopped,

    StartPending,
    StopPending,

    Running,

    ContinuePending,
    PausePending,
    Paused,
}

pub fn new_service() -> Box<dyn Service> {
    cfg_select! {
        unix => Box::new(systemd::SystemdService::new()),
        windows => Box::new(windows::WindowsService::new().expect("windows service host should connect")),
        _ => compiler_error!("Only Windows and Linux supported.")
    }
}

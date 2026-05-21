use crate::systemd_service;
pub trait Service {
    fn is_running(&self) -> bool;
    fn start(&self);

    fn restart(&self);

    fn stop(&self);
}

pub fn new_service(name: &'static str) -> Result<Box<dyn Service>, std::io::Error> {
    return match std::env::consts::OS {
        "linux" => {
            return match systemd_service::SystemdService::new(name) {
                Ok(service) => Ok(Box::new(service)),
                Err(err) => Err(err),
            };
        }
        #[cfg(windows)]
        "windows" => Ok(Box::new(windows_service::new(name))),
        _ => {
            panic!("Only Windows and Linux supported.")
        }
    };
}

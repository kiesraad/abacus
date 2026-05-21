use crate::systemd_service;
pub trait Service {
    fn is_running(&self) -> bool;
    fn start(&self);

    fn restart(&self);

    fn stop(&self);
}

pub fn new_service(name: &'static str) -> Result<Box<dyn Service>, std::io::Error> {
    return match systemd_service::SystemdService::new(name) {
        Ok(service) => Ok(Box::new(service)),
        Err(err) => Err(err),
    };
}

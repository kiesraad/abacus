use crate::common_service::Service;
#[cfg(windows)]
use windows_service::{
    service::{ServiceAccess, UserEventCode},
    service_manager::{ServiceManager, ServiceManagerAccess},
};
#[cfg(windows)]
pub struct WindowsService {
    service: windows_service::service::Service,
}

#[cfg(windows)]
pub fn new(name: &str) -> WindowsService {
    let manager_access = ServiceManagerAccess::CONNECT;
    let service_manager = ServiceManager::local_computer(None::<&str>, manager_access)?;

    let service = service_manager.open_service(
        name,
        ServiceAccess::PAUSE_CONTINUE
            | ServiceAccess::START
            | ServiceAccess::STOP
            | ServiceAccess::INTERROGATE,
    )?;

    WindowsService { service }
}

#[cfg(windows)]
impl Service for WindowsService {
    fn is_running(&self) -> bool {
        todo!()
    }

    fn start(&self) {
        self.service.start();
    }

    fn restart(&self) {
        self.service.stop();
        self.service.start();
    }

    fn stop(&self) {
        self.service.stop();
    }
}

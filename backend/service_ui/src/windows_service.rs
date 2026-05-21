use std::ffi::OsStr;

use crate::common_service::Service;
use windows_service::{
    service::ServiceAccess,
    service_manager::{ServiceManager, ServiceManagerAccess},
};

pub struct WindowsService {
    service: windows_service::service::Service,
}

impl WindowsService {
    pub fn new(name: &str) -> Result<WindowsService, windows_service::Error> {
        let manager_access = ServiceManagerAccess::CONNECT;
        let service_manager = ServiceManager::local_computer(None::<&str>, manager_access)?;

        let service = service_manager.open_service(
            name,
            ServiceAccess::PAUSE_CONTINUE
                | ServiceAccess::START
                | ServiceAccess::STOP
                | ServiceAccess::INTERROGATE,
        )?;

        Ok(WindowsService { service })
    }
}

impl Service for WindowsService {
    fn is_running(&self) -> bool {
        todo!()
    }

    fn start(&self) {
        self.service.start::<&OsStr>(&[]).unwrap();
    }

    fn restart(&self) {
        self.service.stop().unwrap();
        self.service.start::<&OsStr>(&[]).unwrap();
    }

    fn stop(&self) {
        self.service.stop().unwrap();
    }
}

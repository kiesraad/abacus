use std::error::Error;

use windows_service::{
    service::{ServiceAccess, ServiceState as WindowsServiceState},
    service_manager::{ServiceManager, ServiceManagerAccess},
};

use crate::common_service::{Service, ServiceState};

pub struct WindowsService {
    service: windows_service::service::Service,
}

const SERVICE_NAME: &'static str = "abacus_windows_service";

impl WindowsService {
    pub fn new() -> Result<WindowsService, windows_service::Error> {
        let service_manager =
            ServiceManager::local_computer(None::<&str>, ServiceManagerAccess::CONNECT)?;

        let service = service_manager.open_service(
            SERVICE_NAME,
            ServiceAccess::PAUSE_CONTINUE
                | ServiceAccess::START
                | ServiceAccess::STOP
                | ServiceAccess::INTERROGATE
                | ServiceAccess::QUERY_STATUS,
        )?;

        Ok(WindowsService { service: service })
    }
}

impl Service for WindowsService {
    fn status(&self) -> Result<ServiceState, Box<dyn Error>> {
        let Ok(status_query) = self.service.query_status() else {
            return Ok(ServiceState::Stopped);
        };

        Ok(match status_query.current_state {
            WindowsServiceState::Stopped => ServiceState::Stopped,
            WindowsServiceState::StartPending => ServiceState::StartPending,
            WindowsServiceState::StopPending => ServiceState::StopPending,
            WindowsServiceState::Running => ServiceState::Running,
            WindowsServiceState::ContinuePending => ServiceState::ContinuePending,
            WindowsServiceState::PausePending => ServiceState::PausePending,
            WindowsServiceState::Paused => ServiceState::Paused,
        })
    }

    fn start(&self) -> Result<(), Box<dyn Error>> {
        self.service.start(&[SERVICE_NAME])?;

        Ok(())
    }

    fn stop(&self) -> Result<(), Box<dyn Error>> {
        self.service.stop()?;

        Ok(())
    }
}

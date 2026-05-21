use crate::common_service::{Service, ServiceError, ServiceState};
#[cfg(windows)]
use windows_service::{
    Error, service::{ServiceAccess, ServiceState as WindowsServiceState}, service_manager::{ServiceManager, ServiceManagerAccess}
};
#[cfg(windows)]
pub struct WindowsService {
    name: String,
    service: windows_service::service::Service,
}

const SERVICE_NAME: &'static str = "abacus_windows_service";

#[cfg(windows)]
pub fn new() -> Result<WindowsService, ServiceError> {
    let manager_access = ServiceManagerAccess::CONNECT;
    let service_manager = match ServiceManager::local_computer(None::<&str>, manager_access) {
        Ok(service) => service,
        Err(err) => return Err(ServiceError::WindowsError(err)),
    };

    let service = match service_manager.open_service(
        SERVICE_NAME,
        ServiceAccess::PAUSE_CONTINUE
            | ServiceAccess::START
            | ServiceAccess::STOP
            | ServiceAccess::INTERROGATE
            | ServiceAccess::QUERY_STATUS,
    ) {
        Ok(service) => service,
        Err(err) => return Err(ServiceError::WindowsError(err)),
    };

    Ok(WindowsService { name: SERVICE_NAME.to_string(), service: service })
}

#[cfg(windows)]
impl Service for WindowsService {
    fn status(&self) -> ServiceState {
        let status_query = match self.service.query_status() {
            Ok(query) => query,
            Err(_) => return ServiceState::Stopped,
        };
        return match status_query.current_state {
            WindowsServiceState::Stopped => ServiceState::Stopped,
            WindowsServiceState::StartPending => ServiceState::StartPending,
            WindowsServiceState::StopPending => ServiceState::StopPending,
            WindowsServiceState::Running => ServiceState::Running,
            WindowsServiceState::ContinuePending => ServiceState::ContinuePending,
            WindowsServiceState::PausePending => ServiceState::PausePending,
            WindowsServiceState::Paused => ServiceState::Paused,
        }
    }

    fn start(&self) {
        self.service.start(&[&self.name]);
    }

    fn restart(&self) {
        self.service.stop();
        self.service.start(&[&self.name]);
    }

    fn stop(&self) {
        self.service.stop();
    }
}

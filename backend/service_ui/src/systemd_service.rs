use crate::common_service::{Service, ServiceError, ServiceState};
use systemctl;
pub struct SystemdService {
    name: String,
    handler: systemctl::SystemCtl,
}

const SERVICE_NAME: &'static str = "abacus.service";

impl SystemdService {
    pub fn new() -> Result<SystemdService, ServiceError> {
        let sctl = systemctl::SystemCtl::builder()
            .path("/run/current-system/sw/bin/systemctl".into())
            .additional_args(Vec::new())
            .build();

        Ok(SystemdService {
            name: SERVICE_NAME.to_string(),
            handler: sctl,
        })
    }
}

impl Service for SystemdService {
    fn status(&self) -> ServiceState {
        let unit = self.handler.create_unit(&self.name).unwrap();
        return match unit.active {
            true => ServiceState::Running,
            false => ServiceState::Stopped,
        };
    }

    fn start(&self) {
        self.handler.start(&self.name).unwrap();
    }

    fn restart(&self) {
        self.handler.restart(&self.name).unwrap();
    }

    fn stop(&self) {
        self.handler.stop(&self.name).unwrap();
    }
}

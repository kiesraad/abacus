use std::error::Error;

use systemctl::SystemCtl;

use crate::common_service::{Service, ServiceState};

pub struct SystemdService {
    handler: SystemCtl,
}

const SERVICE_NAME: &str = "abacus.service";

impl SystemdService {
    pub fn new() -> SystemdService {
        SystemdService {
            handler: SystemCtl::default(),
        }
    }
}

impl Service for SystemdService {
    fn status(&self) -> Result<ServiceState, Box<dyn Error>> {
        let unit = self.handler.create_unit(SERVICE_NAME)?;

        Ok(match unit.active {
            true => ServiceState::Running,
            false => ServiceState::Stopped,
        })
    }

    fn start(&self) -> Result<(), Box<dyn Error>> {
        self.handler.start(SERVICE_NAME)?;

        Ok(())
    }

    fn stop(&self) -> Result<(), Box<dyn Error>> {
        self.handler.stop(SERVICE_NAME)?;

        Ok(())
    }
}

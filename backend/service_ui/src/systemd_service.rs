use crate::common_service::Service;
use systemctl;
pub struct SystemdService {
    name: String,
    handler: systemctl::SystemCtl,
}

impl SystemdService {
    pub fn new(name: &'static str) -> Result<SystemdService, std::io::Error> {
        let sctl = systemctl::SystemCtl::builder()
            .path("/run/current-system/sw/bin/systemctl".into())
            .additional_args(Vec::new())
            .build();

        Ok(SystemdService {
            name: name.to_string(),
            handler: sctl,
        })
    }
}

impl Service for SystemdService {
    fn is_running(&self) -> bool {
        let unit = self.handler.create_unit(&self.name).unwrap();
        return unit.active;
    }

    fn start(&self) {
        self.handler.start(&self.name);
    }

    fn restart(&self) {
        self.handler.restart(&self.name);
    }

    fn stop(&self) {
        self.handler.stop(&self.name);
    }
}

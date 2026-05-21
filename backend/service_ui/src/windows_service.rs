use crate::common_service::Service;
use windows_service;
pub struct WindowsService {
    name: String,
}

impl Service for WindowsService {
    fn is_running(&self) -> bool {
        todo!()
    }

    fn start(&self) {
        todo!()
    }

    fn restart(&self) {
        todo!()
    }

    fn stop(&self) {
        todo!()
    }
}

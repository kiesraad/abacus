use crate::common_service::Service;
mod common_service;
mod systemd_service;
mod windows_service;

const SERVICE_NAME: &'static str = "abacus.service";
fn main() {
    let service = detect_service().unwrap();
    let is_running = service.is_running();

    match is_running {
        true => {
            println!("Found running service. Attaching...")
        }
        false => {
            println!("Serivce not runing. Starting...");
            service.start();
        }
    }
}

fn detect_service() -> std::io::Result<Box<dyn Service>> {
    let service = common_service::new_service(SERVICE_NAME)?;
    Ok(service)
}

#[cfg(windows)]
fn main() -> windows_service::Result<()> {
    use std::ffi::{OsStr, OsString};
    use windows_service::{
        service::{ServiceAccess, ServiceErrorControl, ServiceInfo, ServiceStartType, ServiceType},
        service_manager::{ServiceManager, ServiceManagerAccess},
    };

    let service_manager = ServiceManager::local_computer(
        None::<&str>,
        ServiceManagerAccess::CONNECT | ServiceManagerAccess::CREATE_SERVICE,
    )?;

    let service_binary_path = ::std::env::current_exe()
        .expect("the program should know the executible path")
        .with_file_name("abacus-windows-service.exe");

    let service_info = ServiceInfo {
        name: OsString::from("abacus_windows_service"),
        display_name: OsString::from("Abacus service"),
        service_type: ServiceType::OWN_PROCESS,
        start_type: ServiceStartType::AutoStart,
        error_control: ServiceErrorControl::Normal,
        executable_path: service_binary_path,
        launch_arguments: vec![],
        dependencies: vec![],
        account_name: None, // run as System
        account_password: None,
    };

    let service = service_manager.create_service(
        &service_info,
        ServiceAccess::CHANGE_CONFIG | ServiceAccess::START,
    )?;
    service.set_description("Windows service running the abacus backend")?;
    service.start::<&OsStr>(&[])?;

    Ok(())
}

#[cfg(not(windows))]
fn main() {
    panic!("This program is only intended to run on Windows.");
}

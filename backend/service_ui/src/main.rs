#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")] // hide console window on Windows in release
use eframe::egui;

mod app;
mod common_service;
mod systemd_service;
mod windows_service_wrapper;

// const SERVICE_NAME: &'static str = "abacus.service";

fn main() -> eframe::Result {
    let options = eframe::NativeOptions {
        viewport: egui::ViewportBuilder::default().with_inner_size([320.0, 240.0]),
        ..Default::default()
    };
    eframe::run_native(
        "Abacus Server Monitor",
        options,
        Box::new(|_| Ok(Box::<app::AbacusApp>::default())),
    )
}

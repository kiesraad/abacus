#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")] // hide console window on Windows in release
use crate::common_service::Service;
use eframe::egui;

mod common_service;
mod systemd_service;
mod windows_service;

const SERVICE_NAME: &'static str = "abacus.service";

fn main() -> eframe::Result {
    let options = eframe::NativeOptions {
        viewport: egui::ViewportBuilder::default().with_inner_size([320.0, 240.0]),
        ..Default::default()
    };
    eframe::run_native(
        "Abacus Server Monitor",
        options,
        Box::new(|cc| Ok(Box::<AbacusApp>::default())),
    )
}

struct AbacusApp {
    service: Box<dyn Service>,
}

impl Default for AbacusApp {
    fn default() -> Self {
        Self {
            service: detect_service().unwrap(),
        }
    }
}

impl eframe::App for AbacusApp {
    fn ui(&mut self, ui: &mut egui::Ui, _frame: &mut eframe::Frame) {
        egui::CentralPanel::default().show_inside(ui, |ui| {
            ui.heading("Abacus Server Monitor");
            if ui.button("Start").clicked() {
                self.service.start();
            }
            if ui.button("Stop").clicked() {
                self.service.stop();
            }
            let status = match self.service.is_running() {
                true => "Running",
                false => "Stopped",
            };
            ui.label(format!("Status: {}", status));
        });
    }
}
fn detect_service() -> std::io::Result<Box<dyn Service>> {
    let service = common_service::new_service(SERVICE_NAME)?;
    Ok(service)
}

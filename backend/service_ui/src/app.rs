use eframe::egui::{self, Window};

use crate::common_service::{self, Service};
const SERVICE_NAME: &'static str = "abacus.service";

#[derive(Debug)]
enum Status {
    Running,
    Stopped,
}
pub struct AbacusApp {
    service: Box<dyn Service>,
    isWaitingForConfirmation: bool,
}

impl AbacusApp {
    fn status(&self) -> Status {
        match self.service.is_running() {
            true => Status::Running,
            false => Status::Stopped,
        }
    }
}

impl Default for AbacusApp {
    fn default() -> Self {
        Self {
            service: detect_service().unwrap(),
            isWaitingForConfirmation: false,
        }
    }
}

impl eframe::App for AbacusApp {
    fn ui(&mut self, ui: &mut egui::Ui, _frame: &mut eframe::Frame) {
        egui::CentralPanel::default().show_inside(ui, |ui| {
            let status = self.status();
            ui.heading("Abacus Server Monitor");

            let button_content = match status {
                Status::Running => "Stop",
                Status::Stopped => "Start",
            };
            if ui.button(button_content).clicked() {
                match status {
                    Status::Running => {
                        self.isWaitingForConfirmation = true;
                    }
                    Status::Stopped => self.service.start(),
                }
            }

            if self.isWaitingForConfirmation {
                Window::new("Confirm Stop").show(ui.ctx(), |ui| {
                    ui.label(
                        "Are you sure you want to stop the server?\nThis action is nonreversible!",
                    );

                    ui.horizontal(|ui| {
                        if ui.button("Yes, Stop").clicked() {
                            self.service.stop();
                            self.isWaitingForConfirmation = false;
                        }

                        if ui.button("Cancel").clicked() {
                            self.isWaitingForConfirmation = false;
                        }
                    });
                });
            }

            ui.label(format!("Status: {:?}", self.status()));
        });
    }
}

fn detect_service() -> std::io::Result<Box<dyn Service>> {
    let service = common_service::new_service(SERVICE_NAME)?;
    Ok(service)
}

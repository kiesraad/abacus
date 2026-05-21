use crate::common_service::{self, Service, ServiceError, ServiceState};
use eframe::egui::{self, Window};
const SERVICE_NAME: &'static str = "abacus.service";

pub struct AbacusApp {
    service: Box<dyn Service>,
    isWaitingForConfirmation: bool,
}

impl AbacusApp {
    fn status(&self) -> ServiceState {
        self.service.status()
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
                ServiceState::Running => "Stop",
                ServiceState::Stopped => "Start",
                _ => "wait",
            };
            if ui.button(button_content).clicked() {
                match status {
                    ServiceState::Running => {
                        self.isWaitingForConfirmation = true;
                    }
                    ServiceState::Stopped => self.service.start(),
                    _ => {},
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

fn detect_service() -> Result<Box<dyn Service>, ServiceError> {
    let service = common_service::new_service()?;
    Ok(service)
}

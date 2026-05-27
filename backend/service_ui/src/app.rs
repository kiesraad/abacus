use crate::common_service::{self, Service, ServiceState};
use eframe::egui::{self, Color32, RichText, Window};

pub struct AbacusApp {
    service: Box<dyn Service>,
    is_waiting_for_confirmation: bool,
}

impl Default for AbacusApp {
    fn default() -> Self {
        Self {
            service: { common_service::new_service().unwrap() },
            is_waiting_for_confirmation: false,
        }
    }
}

impl eframe::App for AbacusApp {
    fn ui(&mut self, ui: &mut egui::Ui, _frame: &mut eframe::Frame) {
        egui::CentralPanel::default().show_inside(ui, |ui| {
            ui.vertical_centered(|ui| {
                let status = self.service.status().unwrap();
                ui.heading("Abacus Server Monitor");

                let button_content = match status {
                    ServiceState::Running => RichText::new("Stop").size(35.),
                    ServiceState::Stopped => RichText::new("Start").size(35.),
                    _ => "wait".into(),
                };
                if ui.button(button_content).clicked() {
                    match status {
                        ServiceState::Running => {
                            self.is_waiting_for_confirmation = true;
                        }
                        ServiceState::Stopped => self.service.start().unwrap(),
                        _ => {}
                    }
                }

                if self.is_waiting_for_confirmation {
                    Window::new("Confirm Stop").show(ui.ctx(), |ui| {
                        ui.label(
                        "Are you sure you want to stop the server?\nThis action is nonreversible!",
                    );

                        ui.horizontal(|ui| {
                            if ui.button("Yes, Stop").clicked() {
                                self.service.stop().unwrap();
                                self.is_waiting_for_confirmation = false;
                            }

                            if ui.button("Cancel").clicked() {
                                self.is_waiting_for_confirmation = false;
                            }
                        });
                    });
                }

                let color = color_from_status(&status);
                ui.horizontal(|ui| {
                    ui.label(RichText::new("Status: ").size(30.));
                    ui.label(
                        RichText::new(format!("{:?}", status))
                            .color(color)
                            .size(30.),
                    );
                });

                ui.label(
                    RichText::new(
                        "You can safely close this window. It will not stop the Abacus server.",
                    )
                    .size(15.),
                );
            });
        });
    }
}

fn color_from_status(status: &ServiceState) -> Color32 {
    return match status {
        ServiceState::Stopped => Color32::RED,
        ServiceState::StartPending => Color32::RED,
        ServiceState::StopPending => Color32::GREEN,
        ServiceState::Running => Color32::GREEN,
        ServiceState::ContinuePending => Color32::RED,
        ServiceState::PausePending => Color32::GREEN,
        ServiceState::Paused => Color32::BLUE,
    };
}

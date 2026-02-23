import type { Locator, Page } from "@playwright/test";

export class ElectionHome {
  readonly header: Locator;
  readonly alert: Locator;
  readonly alertLinkToPollingStations: Locator;
  readonly detailsButton: Locator;
  readonly startButton: Locator;
  readonly statusButton: Locator;
  readonly newSessionButton: Locator;
  readonly newSessionModalConfirmButton: Locator;
  readonly investigationsOverviewButton: Locator;
  readonly startDataEntryButton: Locator;
  readonly pollingStationsRow: Locator;
  readonly downloadNa31_2Bijlage1: Locator;
  readonly downloadN10_2: Locator;
  readonly downloadInlegvel: Locator;

  constructor(protected readonly page: Page) {
    this.header = page.getByRole("heading", { level: 1 });
    this.alert = page.getByRole("alert");
    this.alertLinkToPollingStations = this.alert.getByRole("link", { name: "Stembureaus beheren" });
    this.detailsButton = page.getByRole("button", { name: "Details van de zitting" });
    this.startButton = page.getByRole("button", { name: "Start invoer" });
    this.statusButton = page.getByRole("link", { name: "Bekijk voortgang" });
    this.newSessionButton = page.getByRole("button", { name: "Nieuwe zitting voorbereiden" });
    this.newSessionModalConfirmButton = page.getByRole("button", { name: "Ja, zitting toevoegen" });
    this.investigationsOverviewButton = page.getByRole("button", { name: "Aangevraagde onderzoeken" });
    this.startDataEntryButton = page.getByRole("button", { name: "Start invoer" });
    this.pollingStationsRow = page.getByRole("rowheader", { name: "Stembureaus" });
    this.downloadNa31_2Bijlage1 = page.getByRole("cell", { name: "Na 31-2 Bijlage 1" });
    this.downloadN10_2 = page.getByRole("cell", { name: "N 10-2" });
    this.downloadInlegvel = page.getByRole("cell", { name: "Na 31-2 Inlegvel" });
  }

  getCommitteeSessionCard(number: number) {
    return this.page.getByTestId(`session-${number}`);
  }
}

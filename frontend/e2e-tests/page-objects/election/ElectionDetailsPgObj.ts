import { Locator, Page } from "@playwright/test";

export class ElectionDetailsPgObj {
  readonly header: Locator;
  readonly locationInput: Locator;
  readonly dateInput: Locator;
  readonly timeInput: Locator;
  readonly save: Locator;
  readonly continue: Locator;
  readonly newSessionButton: Locator;
  readonly newSessionModalConfirmButton: Locator;
  readonly investigationsOverviewButton: Locator;
  readonly startDataEntryButton: Locator;

  constructor(protected readonly page: Page) {
    this.header = page.getByRole("heading", { level: 1 });
    this.locationInput = page.getByRole("textbox", { name: "Plaats van de zitting" });
    this.dateInput = page.getByRole("textbox", { name: "Datum" });
    this.timeInput = page.getByRole("textbox", { name: "Tijd" });
    this.save = page.getByRole("button", { name: "Wijzigingen opslaan" });
    this.continue = page.getByRole("button", { name: "Naar proces-verbaal" });
    this.newSessionButton = page.getByRole("button", { name: "Nieuwe zitting voorbereiden" });
    this.newSessionModalConfirmButton = page.getByRole("button", { name: "Ja, zitting toevoegen" });
    this.investigationsOverviewButton = page.getByRole("button", { name: "Aangevraagde onderzoeken" });
    this.startDataEntryButton = page.getByRole("button", { name: "Start steminvoer" });
  }

  async fillForm(location: string, date: string, time: string) {
    await this.locationInput.fill(location);
    await this.dateInput.fill(date);
    await this.timeInput.fill(time);
    await this.save.click();
  }
}

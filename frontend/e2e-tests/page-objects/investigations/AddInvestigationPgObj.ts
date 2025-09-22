import { type Locator, type Page } from "@playwright/test";

export class AddInvestigationPgObj {
  readonly pollingStations: Locator;

  constructor(protected readonly page: Page) {
    this.pollingStations = page.getByRole("table");
  }

  async selectPollingStation(name: string) {
    await this.pollingStations.getByRole("cell", { name: name }).click();
  }
}

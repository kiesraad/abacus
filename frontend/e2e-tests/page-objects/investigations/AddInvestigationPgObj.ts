import { type Locator, type Page } from "@playwright/test";

export class AddInvestigationPgObj {
  readonly pollingStations: Locator;
  readonly header: Locator;

  constructor(protected readonly page: Page) {
    this.pollingStations = page.getByRole("table");
    this.header = page.getByRole("heading", { name: "Voor welk stembureau wordt het onderzoek gedaan?" });
  }

  async selectPollingStation(name: string) {
    await this.pollingStations.getByRole("cell", { name: name }).click();
  }
}

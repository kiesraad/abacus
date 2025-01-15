import { type Locator, type Page } from "@playwright/test";

export class PollingStationListPgObj {
  protected readonly page: Page;

  readonly alert: Locator;
  readonly createPollingStationButton: Locator;

  constructor(page: Page) {
    this.page = page;

    this.alert = page.locator("role=alert");
    this.createPollingStationButton = page.getByRole("button", { name: "Stembureau toevoegen" });
  }
}

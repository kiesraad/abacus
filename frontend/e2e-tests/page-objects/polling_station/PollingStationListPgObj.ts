import type { Locator, Page } from "@playwright/test";

export class PollingStationListPgObj {
  readonly header: Locator;
  readonly alert: Locator;
  readonly createPollingStation: Locator;

  constructor(protected readonly page: Page) {
    this.alert = page.getByRole("alert");
    this.header = page.getByRole("heading", { name: "Stembureaus beheren" });
    this.createPollingStation = page.getByRole("link", { name: "Stembureau toevoegen" });
  }
}

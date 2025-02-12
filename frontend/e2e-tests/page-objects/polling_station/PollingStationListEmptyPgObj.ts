import { type Locator, type Page } from "@playwright/test";

export class PollingStationListEmptyPgObj {
  readonly alert: Locator;
  readonly createPollingStation: Locator;

  constructor(protected readonly page: Page) {
    this.alert = page.locator("role=alert");
    this.createPollingStation = page.getByRole("link", { name: "Handmatig invullen" });
  }
}

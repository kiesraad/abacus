import type { Locator, Page } from "@playwright/test";

export class PollingStationListEmptyPgObj {
  readonly alert: Locator;
  readonly createPollingStation: Locator;
  readonly importButton: Locator;

  constructor(protected readonly page: Page) {
    this.alert = page.locator("role=alert");
    this.createPollingStation = page.getByRole("link", { name: "Handmatig invullen" });
    this.importButton = page.getByRole("link", { name: /Importeren uit een bestand/ });
  }
}

import type { Locator, Page } from "@playwright/test";

export class PollingStationRolePgObj {
  readonly header: Locator;
  readonly next: Locator;

  constructor(protected readonly page: Page) {
    this.header = page.getByRole("heading", { level: 2, name: "Rol van het stembureau" });
    this.next = page.getByRole("button", { name: "Volgende" });
  }
}

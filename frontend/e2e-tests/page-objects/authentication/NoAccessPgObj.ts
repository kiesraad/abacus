import type { Locator, Page } from "@playwright/test";

export class NoAccessPgObj {
  readonly heading: Locator;

  constructor(protected readonly page: Page) {
    this.heading = page.getByRole("heading", { level: 1, name: "Geen toegang" });
  }
}

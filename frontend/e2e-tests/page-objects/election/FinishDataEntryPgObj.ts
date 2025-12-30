import type { Locator, Page } from "@playwright/test";

export class FinishDataEntry {
  readonly finishDataEntry: Locator;
  readonly stayInDataEntry: Locator;

  constructor(protected readonly page: Page) {
    this.finishDataEntry = page.getByRole("button", { name: "Invoerfase afronden" });
    this.stayInDataEntry = page.getByRole("button", { name: "In invoerfase blijven" });
  }
}

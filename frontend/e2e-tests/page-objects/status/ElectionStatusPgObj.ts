import { type Locator, type Page } from "@playwright/test";

export class ElectionStatus {
  readonly finish: Locator;

  constructor(protected readonly page: Page) {
    this.page = page;

    this.finish = page.getByRole("button", { name: "Invoerfase afronden" });
  }
}

import { type Locator, type Page } from "@playwright/test";

export class ElectionStatus {
  protected readonly page: Page;

  readonly finish: Locator;

  constructor(page: Page) {
    this.page = page;

    this.finish = page.getByRole("button", { name: "Invoerfase afronden" });
  }
}

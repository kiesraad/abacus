import { Locator, Page } from "@playwright/test";

export class ElectionReport {
  protected readonly page: Page;

  readonly download: Locator;

  constructor(page: Page) {
    this.page = page;

    this.download = page.getByRole("button", { name: "Download proces-verbaal" });
  }
}

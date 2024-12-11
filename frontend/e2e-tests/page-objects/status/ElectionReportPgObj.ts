import { Locator, Page } from "@playwright/test";

export class ElectionReport {
  protected readonly page: Page;

  readonly downloadPdf: Locator;

  readonly downloadZip: Locator;

  constructor(page: Page) {
    this.page = page;

    this.downloadPdf = page.getByRole("button", { name: "Download los proces-verbaal" });
    this.downloadZip = page.getByRole("button", { name: "Download proces-verbaal met telbestand" });
  }
}

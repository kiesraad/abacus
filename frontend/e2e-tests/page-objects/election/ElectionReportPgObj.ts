import { Locator, Page } from "@playwright/test";

export class ElectionReport {
  readonly downloadPdf: Locator;
  readonly downloadZip: Locator;

  constructor(protected readonly page: Page) {
    this.downloadPdf = page.getByRole("button", { name: "Download los proces-verbaal" });
    this.downloadZip = page.getByRole("button", { name: "Download proces-verbaal met telbestand" });
  }
}

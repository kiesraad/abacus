import { Locator, Page } from "@playwright/test";

export class ElectionReport {
  readonly downloadFirstSessionZip: Locator;
  readonly downloadSecondSessionZip: Locator;
  readonly header: Locator;

  constructor(protected readonly page: Page) {
    this.header = page.getByRole("heading", { level: 1 });
    this.downloadFirstSessionZip = page.getByRole("link", { name: "Download definitieve documenten eerste zitting" });
    this.downloadSecondSessionZip = page.getByRole("link", { name: "Download definitieve documenten tweede zitting" });
  }
}

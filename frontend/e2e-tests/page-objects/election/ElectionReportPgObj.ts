import type { Locator, Page } from "@playwright/test";

export class ElectionReport {
  readonly downloadFirstSessionZip: Locator;
  readonly downloadSecondSessionZip: Locator;
  readonly downloadCSBResultsZip: Locator;
  readonly downloadCSBAttachmentZip: Locator;
  readonly downloadCSBCountsZip: Locator;
  readonly header: Locator;

  constructor(protected readonly page: Page) {
    this.header = page.getByRole("heading", { level: 1 });
    this.downloadFirstSessionZip = page.getByRole("link", { name: "Download definitieve documenten eerste zitting" });
    this.downloadSecondSessionZip = page.getByRole("link", { name: "Download definitieve documenten tweede zitting" });

    this.downloadCSBResultsZip = page.getByRole("link", { name: "Vaststelling uitslag" });
    this.downloadCSBAttachmentZip = page.getByRole("link", { name: "Model P 22-2 Bijlage 1" });
    this.downloadCSBCountsZip = page.getByRole("link", { name: "Definitieve documenten" });
  }
}

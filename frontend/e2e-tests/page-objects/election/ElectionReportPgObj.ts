import { Locator, Page } from "@playwright/test";

export class ElectionReport {
  readonly downloadZip: Locator;
  readonly header: Locator;

  constructor(protected readonly page: Page) {
    this.header = page.getByRole("heading", { level: 1 });
    this.downloadZip = page.getByRole("link", { name: /Download definitieve documenten eerste|tweede zitting/ });
  }
}

import { Locator, Page } from "@playwright/test";

export class ElectionReport {
  readonly downloadZip: Locator;

  constructor(protected readonly page: Page) {
    this.downloadZip = page.getByRole("link", { name: /Download definitieve documenten eerste zitting/ });
  }
}

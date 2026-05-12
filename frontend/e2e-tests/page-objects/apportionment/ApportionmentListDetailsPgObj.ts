import type { Locator, Page } from "@playwright/test";

export class ApportionmentListDetails {
  readonly header: Locator;

  constructor(protected readonly page: Page) {
    this.header = page.getByRole("heading", { level: 1, name: /Lijst \d+ - \w+/ });
  }
}

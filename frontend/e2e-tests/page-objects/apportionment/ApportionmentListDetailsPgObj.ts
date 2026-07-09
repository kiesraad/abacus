import type { Locator, Page } from "@playwright/test";

export class ApportionmentListDetails {
  readonly header: Locator;
  readonly alert: Locator;

  constructor(protected readonly page: Page) {
    this.header = page.getByRole("heading", { level: 1, name: /Lijst \d+ – \w+/ });

    this.alert = page.getByRole("alert");
  }
}

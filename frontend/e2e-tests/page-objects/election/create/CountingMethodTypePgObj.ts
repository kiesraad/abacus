import { expect, type Locator, type Page } from "@playwright/test";

export class CountingMethodTypePgObj {
  readonly header: Locator;
  readonly cso: Locator;
  readonly dso: Locator;
  readonly next: Locator;

  constructor(protected readonly page: Page) {
    this.header = page.getByRole("heading", { level: 2, name: /Type stemopneming in \w/ });
    this.cso = page.getByRole("radio", { name: "Centrale stemopneming (CSO)" });
    this.dso = page.getByRole("radio", { name: "Decentrale stemopneming (DSO)" });
    this.next = page.getByRole("button", { name: "Volgende" });
  }

  async checkHeaderContainsName(name: string) {
    await expect(this.page.getByRole("heading", { level: 2, name: `Type stemopneming in ${name}` })).toBeVisible();
  }
}

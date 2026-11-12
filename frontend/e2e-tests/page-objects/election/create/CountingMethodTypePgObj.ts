import type { Locator, Page } from "@playwright/test";

export class CountingMethodTypePgObj {
  readonly cso: Locator;
  readonly dso: Locator;
  readonly next: Locator;

  constructor(protected readonly page: Page) {
    this.cso = page.getByRole("radio", { name: "Centrale stemopneming (CSO)" });
    this.dso = page.getByRole("radio", { name: "Decentrale stemopneming (DSO)" });
    this.next = page.getByRole("button", { name: "Volgende" });
  }

  getHeader(name: string) {
    return this.page.getByRole("heading", { level: 2, name: `Type stemopneming in ${name}` });
  }
}

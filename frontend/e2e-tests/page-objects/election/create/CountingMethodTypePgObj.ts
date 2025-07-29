import { type Locator, type Page } from "@playwright/test";

export class CountingMethodTypePgObj {
  readonly header: Locator;
  readonly next: Locator;

  constructor(protected readonly page: Page) {
    this.header = page.getByRole("heading", { level: 2, name: "Type stemopneming in Amsterdam" });
    this.next = page.getByRole("button", { name: "Volgende" });
  }
}

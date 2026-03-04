import type { Locator, Page } from "@playwright/test";

export class ElectoralCommitteeRolePgObj {
  readonly header: Locator;
  readonly gsb: Locator;
  readonly csb: Locator;
  readonly next: Locator;

  constructor(protected readonly page: Page) {
    this.header = page.getByRole("heading", { level: 2, name: "Type stembureau" });
    this.gsb = page.getByRole("radio", { name: "Gemeentelijk stembureau (GSB)" });
    this.csb = page.getByRole("radio", { name: "Centraal stembureau (CSB)" });
    this.next = page.getByRole("button", { name: "Volgende" });
  }
}

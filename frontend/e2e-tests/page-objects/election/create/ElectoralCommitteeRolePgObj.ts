import type { Locator, Page } from "@playwright/test";

export class ElectoralCommitteeRolePgObj {
  readonly header: Locator;
  readonly gsb: Locator;
  readonly next: Locator;

  constructor(protected readonly page: Page) {
    this.header = page.getByRole("heading", { level: 2, name: "Rol van het stembureau" });
    this.gsb = page.getByRole("checkbox", { name: "Gemeentelijk stembureau (GSB)" });
    this.next = page.getByRole("button", { name: "Volgende" });
  }
}

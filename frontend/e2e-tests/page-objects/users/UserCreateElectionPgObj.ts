import type { Locator, Page } from "@playwright/test";

export class UserCreateElectionPgObj {
  gsb: Locator;
  csb: Locator;
  continue: Locator;

  constructor(protected readonly page: Page) {
    this.gsb = page.getByRole("radio", { name: "GSB" });
    this.csb = page.getByRole("radio", { name: "CSB" });
    this.continue = page.getByRole("button", { name: "Verder" });
  }
}

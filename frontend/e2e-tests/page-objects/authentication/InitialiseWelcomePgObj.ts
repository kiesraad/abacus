import type { Locator, Page } from "@playwright/test";

export class InitialiseWelcomePgObj {
  readonly header: Locator;
  readonly createAdminAccount: Locator;

  constructor(protected readonly page: Page) {
    this.header = page.getByRole("heading", { level: 1, name: "Welkom bij Abacus" });
    this.createAdminAccount = page.getByRole("button", { name: "Account voor beheerder" });
  }
}

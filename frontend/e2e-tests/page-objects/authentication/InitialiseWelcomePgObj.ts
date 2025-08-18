import { type Locator, Page } from "@playwright/test";

export class InitialiseWelcomePgObj {
  readonly header: Locator;
  readonly button: Locator;

  constructor(protected readonly page: Page) {
    this.header = page.getByRole("heading", { level: 1, name: "Welkom bij Abacus" });
    this.button = page.getByRole("button", { name: "Account voor beheerder" });
  }
}

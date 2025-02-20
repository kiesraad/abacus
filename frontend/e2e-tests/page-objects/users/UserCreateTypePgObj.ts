import { type Locator, type Page } from "@playwright/test";

export class UserCreateTypePgObj {
  withName: Locator;
  anonymous: Locator;
  continue: Locator;

  constructor(protected readonly page: Page) {
    this.withName = page.getByLabel(/Op naam/);
    this.anonymous = page.getByLabel(/Anonieme gebruikersnaam/);
    this.continue = page.getByRole("button", { name: "Verder" });
  }
}

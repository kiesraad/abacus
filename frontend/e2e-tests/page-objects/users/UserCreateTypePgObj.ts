import type { Locator, Page } from "@playwright/test";

export class UserCreateTypePgObj {
  withName: Locator;
  anonymous: Locator;
  continue: Locator;

  constructor(protected readonly page: Page) {
    this.withName = page.getByRole("radio", { name: "Op naam" });
    this.anonymous = page.getByRole("radio", { name: "Anonieme gebruikersnaam" });
    this.continue = page.getByRole("button", { name: "Verder" });
  }
}

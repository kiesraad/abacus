import { type Locator, Page } from "@playwright/test";

import { BasePgObj } from "../BasePgObj";

export class LoginPgObj extends BasePgObj {
  readonly username: Locator;
  readonly password: Locator;
  readonly loginBtn: Locator;
  readonly alert: Locator;

  constructor(protected readonly page: Page) {
    super(page);
    this.username = page.getByLabel("Gebruikersnaam");
    this.password = page.getByLabel("Wachtwoord");
    this.loginBtn = page.getByRole("button", { name: "Inloggen" });
    this.alert = page.getByRole("alert");
  }
}

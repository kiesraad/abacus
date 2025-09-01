import { type Locator, Page } from "@playwright/test";

export class FirstLoginPgObj {
  readonly header: Locator;
  readonly username: Locator;
  readonly password: Locator;
  readonly loginBtn: Locator;
  readonly alert: Locator;

  constructor(protected readonly page: Page) {
    this.header = page.getByRole("heading", { level: 1, name: "Inloggen met account van beheerder" });
    this.username = page.getByLabel("Gebruikersnaam");
    this.password = page.getByLabel("Wachtwoord");
    this.loginBtn = page.getByRole("button", { name: "Inloggen" });
    this.alert = page.getByRole("alert");
  }
}

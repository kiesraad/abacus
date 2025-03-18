import { type Locator, Page } from "@playwright/test";

import { NavBar } from "../NavBarPgObj";

export class LoginPgObj {
  readonly navbar: NavBar;
  readonly username: Locator;
  readonly password: Locator;
  readonly loginBtn: Locator;
  readonly alert: Locator;

  constructor(protected readonly page: Page) {
    this.navbar = new NavBar(page);
    this.username = page.getByLabel("Gebruikersnaam");
    this.password = page.getByLabel("Wachtwoord");
    this.loginBtn = page.getByRole("button", { name: "Inloggen" });
    this.alert = page.getByRole("alert");
  }
}

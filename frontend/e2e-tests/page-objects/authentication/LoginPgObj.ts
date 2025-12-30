import type { Locator, Page } from "@playwright/test";

export class LoginPgObj {
  readonly username: Locator;
  readonly password: Locator;
  readonly loginBtn: Locator;
  readonly alert: Locator;

  constructor(protected readonly page: Page) {
    this.username = page.getByRole("textbox", { name: "Gebruikersnaam" });
    this.password = page.getByRole("textbox", { name: "Wachtwoord" });
    this.loginBtn = page.getByRole("button", { name: "Inloggen" });
    this.alert = page.getByRole("alert");
  }

  async login(username: string, password: string) {
    await this.username.fill(username);
    await this.password.fill(password);
    await this.loginBtn.click();
  }
}

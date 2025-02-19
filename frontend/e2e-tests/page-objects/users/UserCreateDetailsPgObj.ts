import { type Locator, type Page } from "@playwright/test";

export class UserCreateDetailsPgObj {
  readonly username: Locator;
  readonly fullname: Locator;
  readonly password: Locator;
  readonly save: Locator;

  constructor(protected readonly page: Page) {
    this.username = page.getByLabel("Gebruikersnaam");
    this.fullname = page.getByLabel("Volledige naam");
    this.password = page.getByLabel("Tijdelijk wachtwoord");
    this.save = page.getByRole("button", { name: "Opslaan" });
  }
}

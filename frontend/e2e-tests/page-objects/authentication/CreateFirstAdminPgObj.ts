import { type Locator, Page } from "@playwright/test";

export class CreateFirstAdminPgObj {
  readonly header: Locator;
  readonly alert: Locator;
  readonly fullname: Locator;
  readonly username: Locator;
  readonly password: Locator;
  readonly confirmPassword: Locator;
  readonly save: Locator;

  constructor(protected readonly page: Page) {
    this.header = page.getByRole("heading", { level: 1, name: "Account voor beheerder aanmaken" });
    this.alert = page.getByRole("alert");
    this.fullname = page.getByRole("textbox", { name: "Jouw naam (roepnaam +" });
    this.username = page.getByRole("textbox", { name: "Kies een gebruikersnaam" });
    this.password = page.getByRole("textbox", { name: "Kies een wachtwoord" });
    this.confirmPassword = page.getByRole("textbox", { name: "Herhaal wachtwoord" });
    this.save = page.getByRole("button", { name: "Opslaan" });
  }
}

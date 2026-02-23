import type { Locator, Page } from "@playwright/test";

export class UserCreateDetailsPgObj {
  readonly username: Locator;
  readonly fullname: Locator;
  readonly password: Locator;
  readonly save: Locator;

  constructor(protected readonly page: Page) {
    this.username = page.getByRole("textbox", { name: "Gebruikersnaam" });
    this.fullname = page.getByRole("textbox", { name: "Volledige naam" });
    this.password = page.getByRole("textbox", { name: "Tijdelijk wachtwoord" });
    this.save = page.getByRole("button", { name: "Opslaan" });
  }

    async createNamedUser(username: string, fullname: string, password: string) {
        await this.username.fill(username);
        await this.fullname.fill(fullname);
        await this.password.fill(password);
        await this.save.click();
    }
}

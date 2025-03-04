import { type Locator, type Page } from "@playwright/test";

export class UserUpdatePgObj {
  readonly fullname: Locator;
  readonly save: Locator;
  readonly delete: Locator;

  constructor(protected readonly page: Page) {
    this.fullname = page.getByLabel("Volledige naam");
    this.save = page.getByRole("button", { name: "Opslaan" });
    this.delete = page.getByRole("button", { name: "Gebruiker verwijderen" });
  }
}

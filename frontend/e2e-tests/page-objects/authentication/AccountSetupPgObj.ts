import type { Locator, Page } from "@playwright/test";

export class AccountSetupPgObj {
  readonly heading: Locator;
  readonly fullname: Locator;
  readonly password: Locator;
  readonly passwordRepeat: Locator;
  readonly saveBtn: Locator;

  constructor(protected readonly page: Page) {
    this.heading = page.getByRole("heading", { level: 1, name: "Account instellen" });
    this.fullname = page.getByRole("textbox", { name: "Jouw naam (roepnaam +" });
    this.password = page.getByRole("textbox", { name: "Kies nieuw wachtwoord" });
    this.passwordRepeat = page.getByRole("textbox", { name: "Herhaal wachtwoord" });
    this.saveBtn = page.getByRole("button", { name: "Opslaan" });
  }
}

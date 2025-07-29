import { type Locator, type Page } from "@playwright/test";

import { BasePgObj } from "../BasePgObj";

export class AccountSetupPgObj extends BasePgObj {
  readonly fullname: Locator;
  readonly password: Locator;
  readonly passwordRepeat: Locator;
  readonly nextBtn: Locator;

  constructor(protected readonly page: Page) {
    super(page);
    this.fullname = page.getByRole("textbox", { name: "Jouw naam (roepnaam +" });
    this.password = page.getByRole("textbox", { name: "Kies nieuw wachtwoord" });
    this.passwordRepeat = page.getByRole("textbox", { name: "Herhaal wachtwoord" });
    this.nextBtn = page.getByRole("button", { name: "Volgende" });
  }
}

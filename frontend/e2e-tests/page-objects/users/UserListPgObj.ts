import { type Locator, type Page } from "@playwright/test";

import { NavBar } from "../NavBarPgObj";

export class UserListPgObj {
  readonly navBar: NavBar;
  readonly alert: Locator;
  readonly create: Locator;
  readonly table: Locator;

  constructor(protected readonly page: Page) {
    this.navBar = new NavBar(page);
    this.alert = page.locator("role=alert");
    this.create = page.getByRole("link", { name: "Gebruiker toevoegen" });
    this.table = page.getByRole("table");
  }

  row(text: string): Locator {
    return this.table.locator(`tr:has-text("${text}")`);
  }
}

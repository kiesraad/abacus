import { type Locator, type Page } from "@playwright/test";

export class UserListPgObj {
  readonly alert: Locator;
  readonly create: Locator;
  readonly table: Locator;

  constructor(protected readonly page: Page) {
    this.alert = page.locator("role=alert");
    this.create = page.getByRole("link", { name: "Gebruiker toevoegen" });
    this.table = page.getByRole("table");
  }
}

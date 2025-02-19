import { type Locator, type Page } from "@playwright/test";

export class UserCreateRolePgObj {
  administrator: Locator;
  coordinator: Locator;
  typist: Locator;
  continue: Locator;

  constructor(protected readonly page: Page) {
    this.administrator = page.getByLabel(/Beheerder/);
    this.coordinator = page.getByLabel(/Coördinator/);
    this.typist = page.getByLabel(/Invoerder/);
    this.continue = page.getByRole("button", { name: "Verder" });
  }
}

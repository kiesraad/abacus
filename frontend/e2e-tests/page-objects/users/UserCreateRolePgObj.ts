import { type Locator, type Page } from "@playwright/test";

export class UserCreateRolePgObj {
  administrator: Locator;
  coordinator: Locator;
  typist: Locator;
  continue: Locator;

  constructor(protected readonly page: Page) {
    this.administrator = page.getByRole("radio", { name: "Beheerder" });
    this.coordinator = page.getByRole("radio", { name: "Coördinator" });
    this.typist = page.getByRole("radio", { name: "Invoerder" });
    this.continue = page.getByRole("button", { name: "Verder" });
  }
}

import { type Locator, type Page } from "@playwright/test";

export class CoordinatorNavBarPgObj {
  readonly menuButton: Locator;
  readonly navigation: Locator;
  readonly electionsButton: Locator;

  constructor(protected readonly page: Page) {
    this.menuButton = page.getByRole("button", { name: "Menu" });
    this.navigation = page.getByRole("navigation", { name: "primary-navigation" });
    this.electionsButton = this.navigation.getByRole("link", { name: "Verkiezingen" });
  }
}

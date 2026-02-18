import type { Locator, Page } from "@playwright/test";

export class UserInfoTopBar {
  readonly navigation: Locator;
  readonly login: Locator;
  readonly logout: Locator;
  readonly username: Locator;
  readonly role: Locator;

  constructor(protected readonly page: Page) {
    this.navigation = page.getByRole("navigation", { name: "primary-navigation" });
    this.username = this.navigation.getByTestId("navbar-user-name");
    this.role = this.navigation.getByTestId("navbar-role");
    this.login = this.navigation.getByRole("link", { name: "Inloggen" });
    this.logout = this.navigation.getByRole("link", { name: "Afmelden" });
  }
}

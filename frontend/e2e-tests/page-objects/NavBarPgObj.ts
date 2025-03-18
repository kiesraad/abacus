import { type Locator, type Page } from "@playwright/test";

export class NavBar {
  readonly logout: Locator;
  readonly navigation: Locator;
  readonly username: Locator;
  readonly role: Locator;

  constructor(protected readonly page: Page) {
    this.username = page.getByLabel("user-name");
    this.role = page.getByLabel("role");
    this.navigation = page.getByRole("navigation", { name: "primary-navigation" });
    this.logout = this.navigation.getByRole("link", { name: "Afmelden" });
  }

  async clickElection(electionLocation: string, electionName: string) {
    const linkText = `${electionLocation} — ${electionName}`;
    await this.navigation.getByRole("link", { name: linkText }).click();
  }
}

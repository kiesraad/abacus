import { type Locator, type Page } from "@playwright/test";

export class NavBar {
  readonly logout: Locator;
  readonly navigation: Locator;
  readonly username: Locator;
  readonly role: Locator;
  readonly electionOverviewButton: Locator;

  constructor(protected readonly page: Page) {
    this.navigation = page.getByRole("navigation", { name: "primary-navigation" });
    this.logout = this.navigation.getByRole("link", { name: "Afmelden" });
    this.username = this.navigation.getByTestId("navbar-username");
    this.role = this.navigation.getByTestId("navbar-role");
    this.electionOverviewButton = page.getByRole("link", { name: "Verkiezingen" });
  }

  async clickElection(electionLocation: string, electionName: string) {
    const linkText = `${electionLocation} — ${electionName}`;
    await this.navigation.getByRole("link", { name: linkText }).click();
  }
}

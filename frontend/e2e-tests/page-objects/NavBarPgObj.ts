import { type Locator, type Page } from "@playwright/test";

export class NavBarPgObj {
  readonly logout: Locator;
  readonly navigation: Locator;

  constructor(protected readonly page: Page) {
    this.navigation = page.getByRole("navigation", { name: "primary-navigation" });
    this.logout = this.navigation.getByRole("link", { name: "Afmelden" });
  }

  async clickElectionInNavBar(electionLocation: string, electionName: string) {
    const linkText = `${electionLocation} — ${electionName}`;
    await this.navigation.getByRole("link", { name: linkText }).click();
  }
}

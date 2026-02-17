import type { Locator, Page } from "@playwright/test";

export class TypistNavBar {
  readonly navigation: Locator;

  constructor(protected readonly page: Page) {
    this.navigation = page.getByRole("navigation", { name: "primary-navigation" });
  }

  async clickElection(electionLocation: string, electionName: string) {
    const linkText = `${electionLocation} — ${electionName}`;
    await this.navigation.getByRole("link", { name: linkText }).click();
  }
}

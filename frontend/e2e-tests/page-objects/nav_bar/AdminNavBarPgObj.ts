import type { Locator, Page } from "@playwright/test";

export class AdminNavBar {
  readonly navigation: Locator;
  readonly electionOverviewButton: Locator;
  readonly users: Locator;

  constructor(protected readonly page: Page) {
    this.navigation = page.getByRole("navigation", { name: "primary-navigation" });
    this.electionOverviewButton = this.navigation.getByRole("link", {name: "Verkiezingen"});
    this.users = this.navigation.getByRole("link", {name: "Gebruikers"});
  }

  getElectionBreadcrumb(electionName: string) {
    return this.navigation.getByRole("link", { name: electionName });
  }
}

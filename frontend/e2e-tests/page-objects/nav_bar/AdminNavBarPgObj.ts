import type { Locator, Page } from "@playwright/test";

export class AdminNavBar {
  readonly navigation: Locator;
  readonly electionOverviewButton: Locator;

  constructor(protected readonly page: Page) {
    this.navigation = page.getByRole("navigation", { name: "primary-navigation" });
    this.electionOverviewButton = page.getByRole("link", { name: "Verkiezingen" });
  }

  getElectionBreadcrumb(electionName: string) {
    return this.navigation.getByRole("link", { name: electionName });
  }
}

import { type Locator, type Page } from "@playwright/test";

import { NavBar } from "./NavBarPgObj";

export class AdminNavBar extends NavBar {
  readonly electionOverviewButton: Locator;

  constructor(protected readonly page: Page) {
    super(page);
    this.electionOverviewButton = page.getByRole("link", { name: "Verkiezingen" });
  }
}

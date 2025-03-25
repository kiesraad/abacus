import { type Locator, type Page } from "@playwright/test";

import { NavBar } from "../NavBarPgObj";

export class OverviewPgObj {
  readonly navBar: NavBar;
  readonly alert: Locator;

  constructor(protected readonly page: Page) {
    this.navBar = new NavBar(page);
    this.alert = page.getByRole("heading", { name: "Je account is ingesteld" });
  }
}

import { type Locator, type Page } from "@playwright/test";

import { NavBar } from "../NavBarPgObj";

export class OverviewPgObj {
  readonly navBar: NavBar;
  readonly header: Locator;
  readonly alert: Locator;
  readonly create: Locator;
  readonly elections: Locator;
  readonly electionsInReadyState: Locator;

  constructor(protected readonly page: Page) {
    this.navBar = new NavBar(page);
    this.header = page.getByRole("heading", { name: "Beheer verkiezingen" });
    this.alert = page.getByRole("heading", { name: "Je account is ingesteld" });
    this.create = page.getByRole("link", { name: "Verkiezing toevoegen" });
    this.elections = page.getByTestId("overview").locator("tbody").getByRole("row");
    this.electionsInReadyState = this.elections.filter({ hasText: "Klaar voor invoer" });
  }
}

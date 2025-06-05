import { type Locator, type Page } from "@playwright/test";

import { NavBar } from "../NavBarPgObj";

export class OverviewPgObj {
  readonly navBar: NavBar;
  readonly header: Locator;
  readonly alert: Locator;
  readonly create: Locator;
  readonly importedElections: Locator;
  readonly readyStates: Locator;

  constructor(protected readonly page: Page) {
    this.navBar = new NavBar(page);
    this.header = page.getByRole("heading", { name: "Beheer verkiezingen" });
    this.alert = page.getByRole("heading", { name: "Je account is ingesteld" });
    this.create = page.getByRole("link", { name: "Verkiezing toevoegen" });
    this.importedElections = page.getByText("Gemeenteraad Amsterdam 2022");
    this.readyStates = page.getByText("Klaar voor invoer");
  }

  async electionCount(): Promise<number> {
    return await this.importedElections.count();
  }

  async readyStateCount(): Promise<number> {
    return await this.readyStates.count();
  }
}

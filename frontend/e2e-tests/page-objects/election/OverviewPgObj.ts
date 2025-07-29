import { type Locator, type Page } from "@playwright/test";

import { BasePgObj } from "../BasePgObj";

export class OverviewPgObj extends BasePgObj {
  readonly main: Locator;
  readonly header: Locator;
  readonly alert: Locator;
  readonly create: Locator;
  readonly elections: Locator;
  readonly electionsCreatedState: Locator;

  constructor(protected readonly page: Page) {
    super(page);
    this.main = page.getByRole("main");
    this.header = page.getByRole("heading", { name: "Beheer verkiezingen" });
    this.alert = page.getByRole("heading", { name: "Je account is ingesteld" });
    this.create = page.getByRole("link", { name: "Verkiezing toevoegen" });
    this.elections = page.getByTestId("overview").locator("tbody").getByRole("row");
    this.electionsCreatedState = this.elections.filter({ hasText: "Zitting voorbereiden" });
  }
}

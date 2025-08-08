import { type Locator, type Page } from "@playwright/test";

export class OverviewPgObj {
  readonly main: Locator;
  readonly header: Locator;
  readonly alert: Locator;
  readonly create: Locator;
  readonly elections: Locator;

  constructor(protected readonly page: Page) {
    this.main = page.getByRole("main");
    this.header = page.getByRole("heading", { name: "Beheer verkiezingen" });
    this.alert = page.getByRole("alert").filter({ hasText: "Je account is ingesteld" });
    this.create = page.getByRole("link", { name: "Verkiezing toevoegen" });
    this.elections = page.getByTestId("overview").locator("tbody").getByRole("row");
  }

  findElectionRowById(electionId: number) {
    return this.page.getByTestId(`election-row-${electionId}`);
  }
}

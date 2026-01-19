import type { Locator, Page } from "@playwright/test";

export class ElectionsOverviewPgObj {
  readonly main: Locator;
  readonly adminHeader: Locator;
  readonly header: Locator;
  readonly create: Locator;
  readonly elections: Locator;
  readonly alertAccountSetup: Locator;
  readonly alertElectionCreated: Locator;

  constructor(protected readonly page: Page) {
    this.main = page.getByRole("main");
    this.adminHeader = page.getByRole("heading", { name: "Verkiezingen beheren" });
    this.header = page.getByRole("heading", { name: "Verkiezingen" });
    this.create = page.getByRole("link", { name: "Verkiezing toevoegen" });
    this.elections = page.getByTestId("overview").locator("tbody").getByRole("row");

    this.alertAccountSetup = page.getByRole("alert").filter({ hasText: "Je account is ingesteld" });
    this.alertElectionCreated = page.getByRole("alert").filter({ hasText: /^Verkiezing GSB [\w|\s]+ toegevoegd$/ });
  }

  findElectionRowById(electionId: number) {
    return this.page.getByTestId(`election-row-${electionId}`);
  }
}

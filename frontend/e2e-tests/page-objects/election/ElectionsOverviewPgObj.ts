import type { Locator, Page } from "@playwright/test";
import type { CommitteeCategory } from "@/types/generated/openapi";

export class ElectionsOverviewPgObj {
  readonly main: Locator;
  readonly adminHeader: Locator;
  readonly header: Locator;
  readonly create: Locator;
  readonly elections: Locator;
  readonly alertAccountSetup: Locator;

  constructor(protected readonly page: Page) {
    this.main = page.getByRole("main");
    this.adminHeader = page.getByRole("heading", { name: "Verkiezingen beheren" });
    this.header = page.getByRole("heading", { name: "Verkiezingen" });
    this.create = page.getByRole("link", { name: "Verkiezing toevoegen" });
    this.elections = page.getByTestId("overview").locator("tbody").getByRole("row");

    this.alertAccountSetup = page.getByRole("alert").filter({ hasText: "Je account is ingesteld" });
  }

  getAlertElectionCreated(committeeCategory: CommitteeCategory, electionName: string) {
    return this.page
      .getByRole("alert")
      .filter({ hasText: `Verkiezing ${committeeCategory} ${electionName} toegevoegd` });
  }

  findElectionRowById(electionId: number) {
    return this.page.getByTestId(`election-row-${electionId}`);
  }
}

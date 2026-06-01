import type { Locator, Page } from "@playwright/test";

export class Apportionment {
  readonly allSeatsAssigned: Locator;
  readonly allSeatsAssignedAlert: Locator;
  readonly apportionmentTable: Locator;
  readonly header: Locator;
  readonly toReport: Locator;
  readonly fullSeatInformation: Locator;
  readonly fullSeatsPageLink: Locator;
  readonly residualSeatInformation: Locator;
  readonly residualSeatsPageLink: Locator;
  readonly manageDeceasedCandidates: Locator;

  constructor(protected readonly page: Page) {
    this.header = page.getByRole("heading", { level: 1, name: "Zetelverdeling" });

    this.allSeatsAssigned = page.getByRole("strong").filter({
      hasText: "Alle zetels zijn toegewezen",
    });

    this.apportionmentTable = page.getByTestId("apportionment-table");

    this.allSeatsAssignedAlert = page.getByRole("alert").filter({ has: this.allSeatsAssigned });
    this.toReport = page.getByRole("link", { name: "Naar proces-verbaal" });

    this.fullSeatInformation = page.getByText(/\d+ zetels werden als volle zetel toegewezen/);
    this.fullSeatsPageLink = this.fullSeatInformation.getByRole("link", { name: "bekijk details" });

    this.residualSeatInformation = page.getByText(/\d+ zetels werden als restzetel toegewezen/);
    this.residualSeatsPageLink = this.residualSeatInformation.getByRole("link", { name: "bekijk details" });

    this.manageDeceasedCandidates = page.getByRole("link", { name: "Beheer overleden kandidaten" });
  }

  async clickList(listNumber: number) {
    await this.page.getByTestId(`list-${listNumber}`).click();
  }
}

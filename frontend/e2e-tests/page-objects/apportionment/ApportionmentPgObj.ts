import type { Locator, Page } from "@playwright/test";

export class Apportionment {
  readonly allSeatsAssigned: Locator;
  readonly allSeatsAssignedAlert: Locator;
  readonly toReport: Locator;
  readonly drawingLotsForListNeeded: Locator;
  readonly drawingLotsForListNeededAlert: Locator;
  readonly toDrawingLots: Locator;
  readonly toResidualSeatAllocationDetails: Locator;
  readonly drawingLotsForCandidateNeeded: Locator;
  readonly drawingLotsForCandidateNeededAlert: Locator;
  readonly preliminaryResult: Locator;
  readonly apportionment: Locator;
  readonly apportionmentTable: Locator;
  readonly header: Locator;
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
    this.allSeatsAssignedAlert = page.getByRole("alert").filter({ has: this.allSeatsAssigned });
    this.toReport = page.getByRole("link", { name: "Naar proces-verbaal" });

    this.drawingLotsForListNeeded = page.getByRole("strong").filter({
      hasText: /Loting noodzakelijk voor toekennen restzetel \d/,
    });
    this.drawingLotsForListNeededAlert = page.getByRole("alert").filter({ has: this.drawingLotsForListNeeded });
    this.toDrawingLots = page.getByRole("link", { name: "Naar loting" });
    this.toResidualSeatAllocationDetails = page.getByRole("link", { name: "Details restzetelverdeling" });
    this.drawingLotsForCandidateNeeded = page.getByRole("strong").filter({
      hasText: "Loting noodzakelijk voor kandidaten met gelijk aantal voorkeursstemmen",
    });
    this.drawingLotsForCandidateNeededAlert = page
      .getByRole("alert")
      .filter({ has: this.drawingLotsForCandidateNeeded });

    this.preliminaryResult = page.getByRole("heading", { level: 2, name: "Voorlopig resultaat" });
    this.apportionment = page.getByRole("heading", { level: 2, name: "Zetelverdeling" });
    this.apportionmentTable = page.getByTestId("apportionment-table");

    this.fullSeatInformation = page.getByText(/\d+ zetels werden als volle zetel toegewezen/);
    this.fullSeatsPageLink = this.fullSeatInformation.getByRole("link", { name: "bekijk details" });

    this.residualSeatInformation = page.getByText(/\d+ zetels werden als restzetel toegewezen/);
    this.residualSeatsPageLink = this.residualSeatInformation.getByRole("link", { name: "bekijk details" });

    this.manageDeceasedCandidates = page.getByRole("link", { name: "Beheer overleden kandidaten" });
  }

  getAlertByText(text: string) {
    return this.page.getByRole("alert").filter({
      hasText: text,
    });
  }

  async clickList(listNumber: number) {
    await this.page.getByTestId(`list-${listNumber}`).click();
  }
}

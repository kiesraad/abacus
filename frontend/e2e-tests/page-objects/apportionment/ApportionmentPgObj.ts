import type { Locator, Page } from "@playwright/test";

export class Apportionment {
  readonly allSeatsAssigned: Locator;
  readonly allSeatsAssignedAlert: Locator;
  readonly header: Locator;
  readonly toReport: Locator;
  readonly fullSeatInformation: Locator;
  readonly fullSeatsPageLink: Locator;
  readonly residualSeatInformation: Locator;
  readonly residualSeatsPageLink: Locator;

  constructor(protected readonly page: Page) {
    this.header = page.getByRole("heading", { level: 1, name: "Zetelverdeling" });

    this.allSeatsAssigned = page.getByRole("strong").filter({
      hasText: "Alle zetels zijn toegewezen",
    });

    this.allSeatsAssignedAlert = page.getByRole("alert").filter({ has: this.allSeatsAssigned });
    this.toReport = page.getByRole("link", { name: "Naar proces-verbaal" });

    this.fullSeatInformation = page.getByText(/\d+ zetels werden als volle zetel toegewezen/);
    this.fullSeatsPageLink = this.fullSeatInformation.getByRole("link", { name: "bekijk details" });

    this.residualSeatInformation = page.getByText(/\d+ zetels werden als restzetel toegewezen/);
    this.residualSeatsPageLink = this.residualSeatInformation.getByRole("link", { name: "bekijk details" });
  }
}

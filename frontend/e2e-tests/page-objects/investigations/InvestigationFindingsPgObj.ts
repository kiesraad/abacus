import { type Locator, type Page } from "@playwright/test";

export class InvestigationFindingsPgObj {
  readonly header: Locator;
  readonly findingsField: Locator;
  readonly correctedResultsYes: Locator;
  readonly correctedResultsNo: Locator;
  readonly save: Locator;

  constructor(protected readonly page: Page) {
    this.header = page.getByRole("heading", { name: "Bevindingen van het onderzoek" });
    this.findingsField = page.getByRole("textbox", { name: "Bevindingen" });
    this.correctedResultsYes = page.getByLabel("Ja");
    this.correctedResultsNo = page.getByLabel("Nee");
    this.save = page.getByRole("button", { name: "Opslaan" });
  }
}

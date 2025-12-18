import { type Locator, type Page } from "@playwright/test";

export class InvestigationFindingsPgObj {
  readonly header: Locator;
  readonly findingsField: Locator;
  readonly correctedResultsYes: Locator;
  readonly correctedResultsNo: Locator;
  readonly save: Locator;

  constructor(protected readonly page: Page) {
    this.header = page.getByRole("heading", {
      level: 2,
      name: "Bevindingen van het onderzoek door het gemeentelijk stembureau",
    });
    this.findingsField = page.getByRole("textbox", { name: "Bevindingen" });
    this.correctedResultsYes = page.getByRole("checkbox", { name: "Ja" });
    this.correctedResultsNo = page.getByRole("checkbox", { name: "Nee" });
    this.save = page.getByRole("button", { name: "Opslaan" });
  }

  setCorrectedResults(corrected: boolean) {
    if (corrected) {
      return this.correctedResultsYes.check();
    }

    return this.correctedResultsNo.check();
  }
}

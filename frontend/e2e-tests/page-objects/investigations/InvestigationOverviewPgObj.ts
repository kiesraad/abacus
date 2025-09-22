import { type Locator, type Page } from "@playwright/test";

export class InvestigationOverviewPgObj {
  readonly addInvestigationButton: Locator;

  constructor(protected readonly page: Page) {
    this.addInvestigationButton = page.getByRole("link", { name: "Onderzoek toevoegen" });
  }
}

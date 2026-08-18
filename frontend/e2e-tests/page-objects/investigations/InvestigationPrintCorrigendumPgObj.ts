import type { Locator, Page } from "@playwright/test";

export class InvestigationPrintCorrigendumPgObj {
  readonly header: Locator;
  readonly backToInvestigationsButton: Locator;
  readonly continueButton: Locator;
  readonly downloadLink: Locator;

  constructor(protected readonly page: Page) {
    this.header = page.getByRole("heading", { name: "Print het corrigendum" });
    this.backToInvestigationsButton = page.getByRole("link", { name: "Terug naar alle onderzoeken" });
    this.continueButton = page.getByRole("link", { name: "Verder naar bevindingen" });
    this.downloadLink = page.getByRole("link", { name: /Download corrigendum voor stembureau \d+/ });
  }
}

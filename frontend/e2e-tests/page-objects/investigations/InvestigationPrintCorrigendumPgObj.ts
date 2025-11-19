import { type Locator, type Page } from "@playwright/test";

export class InvestigationPrintCorrigendumPgObj {
  readonly header: Locator;
  readonly continueButton: Locator;
  readonly downloadLink: Locator;

  constructor(protected readonly page: Page) {
    this.header = page.getByRole("heading", { name: "Print het corrigendum" });
    this.continueButton = page.getByRole("link", { name: "Verder naar bevindingen" });
    this.downloadLink = page.getByRole("link", { name: /Download corrigendum voor stembureau \d+/ });
  }
}

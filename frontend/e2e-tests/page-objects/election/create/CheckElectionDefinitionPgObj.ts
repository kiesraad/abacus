import { type Locator, type Page } from "@playwright/test";

export class CheckElectionDefinitionPgObj {
  readonly header: Locator;
  readonly hash: Locator;
  readonly hashInput1: Locator;
  readonly hashInput2: Locator;
  readonly next: Locator;
  readonly error: Locator;
  readonly backToOverviewButton: Locator;

  constructor(protected readonly page: Page) {
    this.header = page.getByRole("heading", { level: 2, name: "Controleer verkiezingsdefinitie" });
    this.hash = page.getByTestId("hash");
    this.hashInput1 = page.getByLabel("Controle deel 1");
    this.hashInput2 = page.getByLabel("Controle deel 2");
    this.next = page.getByRole("button", { name: "Volgende" });
    this.error = page.getByRole("heading", { level: 3, name: "Controle digitale vingerafdruk niet gelukt" });
    this.backToOverviewButton = page.getByRole("link", { name: "Verkiezingen" });
  }
}

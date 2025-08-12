import { type Locator, type Page } from "@playwright/test";

export class NumberOfVotersPgObj {
  readonly header: Locator;
  readonly hint: Locator;
  readonly error: Locator;
  readonly input: Locator;
  readonly next: Locator;

  constructor(protected readonly page: Page) {
    this.header = page.getByRole("heading", { level: 2, name: "Hoeveel kiesgerechtigden telt de gemeente?" });
    this.hint = page.getByText("Ingelezen uit bestand met stembureaus");
    this.error = page.getByText("Vul het aantal kiesgerechtigden in");
    this.input = page.getByLabel("Aantal kiesgerechtigden");
    this.next = page.getByRole("button", { name: "Volgende" });
  }
}

import { type Locator, type Page } from "@playwright/test";

export class InvestigationReasonPgObj {
  readonly header: Locator;
  readonly reasonField: Locator;
  readonly nextButton: Locator;

  constructor(protected readonly page: Page) {
    this.header = page.getByRole("heading", { name: "Aanleiding en opdracht" });
    this.reasonField = page.getByRole("textbox", { name: "Aanleiding en opdracht" });
    this.nextButton = page.getByRole("button", { name: "Volgende" });
  }
}

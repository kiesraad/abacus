import { type Locator, type Page } from "@playwright/test";

export class CheckAndSavePgObj {
  readonly header: Locator;
  readonly numberOfVoters: Locator;
  readonly countingMethod: Locator;
  readonly save: Locator;

  constructor(protected readonly page: Page) {
    this.header = page.getByRole("heading", { level: 2, name: "Controleren en opslaan" });
    this.numberOfVoters = page.getByTestId("number-of-voters");
    this.countingMethod = page.getByTestId("counting-method");
    this.save = page.getByRole("button", { name: "Opslaan" });
  }
}

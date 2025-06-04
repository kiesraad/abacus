import { type Locator, type Page } from "@playwright/test";

export class ResolveErrorsPgObj {
  readonly validationError: Locator;
  readonly resumeFirstEntry: Locator;
  readonly discardFirstEntry: Locator;
  readonly save: Locator;

  constructor(protected readonly page: Page) {
    this.validationError = page.getByText(/Dit is een verplichte vraag/);
    this.resumeFirstEntry = page.getByLabel(/Invoer bewaren/);
    this.discardFirstEntry = page.getByLabel(/Invoer verwijderen/);
    this.save = page.getByRole("button", { name: "Opslaan" });
  }
}

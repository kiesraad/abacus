import { type Locator, type Page } from "@playwright/test";

export class ResolveDifferencesPgObj {
  readonly dataEntryValues: Promise<Array<Locator>>;
  readonly validationError: Locator;
  readonly keepFirstEntry: Locator;
  readonly keepSecondEntry: Locator;
  readonly discardBothEntries: Locator;
  readonly save: Locator;

  constructor(protected readonly page: Page) {
    this.dataEntryValues = this.page.getByRole("cell").all();
    this.validationError = page.getByText(/Dit is een verplichte vraag/);
    this.keepFirstEntry = page.getByLabel(/De eerste invoer/);
    this.keepSecondEntry = page.getByLabel(/De tweede invoer/);
    this.discardBothEntries = page.getByLabel(/Geen van beide/);
    this.save = page.getByRole("button", { name: "Opslaan" });
  }
}

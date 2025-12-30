import type { Locator, Page } from "@playwright/test";

export class ResolveDifferencesPgObj {
  readonly title: Locator;
  readonly firstValue: Locator;
  readonly secondValue: Locator;
  readonly validationError: Locator;
  readonly keepFirstEntry: Locator;
  readonly keepSecondEntry: Locator;
  readonly discardBothEntries: Locator;
  readonly save: Locator;

  constructor(protected readonly page: Page) {
    this.title = this.page.getByRole("heading", { name: "Verschil tussen eerste en tweede invoer" });
    this.firstValue = this.page.getByRole("cell").nth(0);
    this.secondValue = this.page.getByRole("cell").nth(1);
    this.validationError = page.getByText(/Dit is een verplichte vraag/);
    this.keepFirstEntry = page.getByRole("radio", { name: /De eerste invoer/ });
    this.keepSecondEntry = page.getByRole("radio", { name: /De tweede invoer/ });
    this.discardBothEntries = page.getByRole("radio", { name: /Geen van beide/ });
    this.save = page.getByRole("button", { name: "Opslaan" });
  }
}

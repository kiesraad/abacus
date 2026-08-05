import type { Locator, Page } from "@playwright/test";

export class ResolveDifferencesPgObj {
  readonly title: Locator;
  readonly firstValue: Locator;
  readonly secondValue: Locator;
  readonly validationError: Locator;
  readonly keepFirstEntry: Locator;
  readonly keepSecondEntry: Locator;
  readonly discardBothEntries: Locator;
  readonly wrongEntryQuestion: Locator;
  readonly correctWrongEntry: Locator;
  readonly discardWrongEntry: Locator;
  readonly correctionBlocked: Locator;
  readonly save: Locator;
  readonly continueToResolveErrors: Locator;

  constructor(protected readonly page: Page) {
    this.title = this.page.getByRole("heading", { name: "Verschil tussen eerste en tweede invoer" });
    this.firstValue = this.page.getByRole("cell").nth(0);
    this.secondValue = this.page.getByRole("cell").nth(1);
    this.validationError = page.getByText(/Dit is een verplichte vraag/);
    this.keepFirstEntry = page.getByRole("radio", { name: /Eerste invoer/ });
    this.keepSecondEntry = page.getByRole("radio", { name: /Tweede invoer/ });
    this.discardBothEntries = page.getByRole("radio", { name: /Geen van beide/ });
    this.wrongEntryQuestion = page.getByRole("heading", { name: /Wat wil je doen/ });
    this.correctWrongEntry = page.getByRole("radio", { name: /Verschillen laten herstellen/ });
    this.discardWrongEntry = page.getByRole("radio", { name: /Hele proces-verbaal opnieuw/ });
    this.correctionBlocked = page.getByText(/Uit de tweede invoer blijkt/);
    this.save = page.getByRole("button", { name: "Opslaan" });
    this.continueToResolveErrors = page.getByRole("button", { name: "Verder naar fouten oplossen" });
  }
}

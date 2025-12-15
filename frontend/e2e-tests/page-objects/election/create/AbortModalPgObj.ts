import { type Locator, type Page } from "@playwright/test";

export class AbortModalPgObj {
  readonly header: Locator;
  readonly deleteButton: Locator;
  readonly closeButton: Locator;
  readonly cancelButton: Locator;

  constructor(protected readonly page: Page) {
    this.header = page.getByRole("heading", { level: 3, name: "Niet opgeslagen wijzigingen" });
    this.deleteButton = page.getByRole("button", { name: "Verkiezing niet opslaan" });
    this.closeButton = page.getByRole("dialog").getByRole("button", { name: "Venster sluiten" });
    this.cancelButton = page.getByRole("dialog").getByRole("button", { name: "Annuleren" });
  }
}

import type { Locator, Page } from "@playwright/test";

export class DeleteCertificateModal {
  readonly header: Locator;
  readonly deleteButton: Locator;
  readonly closeButton: Locator;
  readonly cancelButton: Locator;

  constructor(protected readonly page: Page) {
    this.header = page.getByRole("heading", { level: 3, name: "Publieke sleutel verwijderen?" });
    this.deleteButton = page.getByRole("button", { name: "Verwijder sleutel" });
    this.closeButton = page.getByRole("dialog").getByRole("button", { name: "Venster sluiten" });
    this.cancelButton = page.getByRole("dialog").getByRole("button", { name: "Annuleren" });
  }
}

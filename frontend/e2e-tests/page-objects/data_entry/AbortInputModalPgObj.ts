import { type Locator, type Page } from "@playwright/test";

export class AbortInputModal {
  readonly modal: Locator;
  readonly close: Locator;
  readonly heading: Locator;
  readonly saveInput: Locator;
  readonly discardInput: Locator;

  constructor(protected readonly page: Page) {
    this.modal = page.getByRole("dialog");
    this.close = this.modal.getByRole("button", { name: "Venster sluiten" });
    this.heading = this.modal.getByRole("heading", {
      level: 3,
      name: "Wat wil je doen met je invoer?",
    });
    this.saveInput = this.modal.getByRole("button", { name: "Invoer bewaren" });
    this.discardInput = this.modal.getByRole("button", { name: "Verwijder invoer" });
  }
}

import { type Locator, type Page } from "@playwright/test";

export class AbortInputModal {
  protected readonly page: Page;

  readonly modal: Locator;
  readonly close: Locator;
  readonly heading: Locator;
  readonly saveInput: Locator;
  readonly discardInput: Locator;

  constructor(page: Page) {
    this.page = page;

    this.modal = page.getByRole("dialog");
    this.close = this.modal.getByRole("button", { name: "Annuleren" });
    this.heading = this.modal.getByRole("heading", {
      level: 2,
      name: "Wat wil je doen met je invoer?",
    });
    this.saveInput = this.modal.getByRole("button", { name: "Invoer bewaren" });
    this.discardInput = this.modal.getByRole("button", { name: "Niet bewaren" });
  }
}

import { type Locator, type Page } from "@playwright/test";

export class UnsavedChangesModal {
  protected readonly page: Page;

  readonly modal: Locator;
  readonly heading: Locator;
  readonly saveInput: Locator;
  readonly discardInput: Locator;

  constructor(page: Page) {
    this.page = page;

    this.modal = page.getByRole("dialog");
    this.heading = this.modal.getByRole("heading", {
      level: 2,
      name: "Let op: niet opgeslagen wijzigingen",
    });
    this.saveInput = this.modal.getByRole("button", { name: "Wijzigingen opslaan" });
    this.discardInput = this.modal.getByRole("button", { name: "Niet bewaren" });
  }
}

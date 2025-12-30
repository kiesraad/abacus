import type { Locator, Page } from "@playwright/test";

export class UserDeleteModal {
  readonly modal: Locator;
  readonly delete: Locator;

  constructor(protected readonly page: Page) {
    this.modal = page.getByRole("dialog");
    this.delete = this.modal.getByRole("button", { name: /Verwijderen/ });
  }
}

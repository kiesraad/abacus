import type { Locator, Page } from "@playwright/test";

export class ErrorModalPgObj {
  readonly dialog: Locator;
  readonly title: Locator;
  readonly text: Locator;
  readonly close: Locator;

  constructor(protected readonly page: Page) {
    this.dialog = page.getByRole("dialog");
    this.title = this.dialog.getByRole("heading", { level: 3 });
    this.text = this.dialog.getByRole("paragraph");
    this.close = this.dialog.getByRole("button", { name: "Melding sluiten" });
  }
}

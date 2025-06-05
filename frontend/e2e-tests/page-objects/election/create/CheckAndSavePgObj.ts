import { type Locator, type Page } from "@playwright/test";

export class CheckAndSavePgObj {
  readonly header: Locator;
  readonly save: Locator;

  constructor(protected readonly page: Page) {
    this.header = page.getByRole("heading", { level: 2, name: "Controleren en opslaan" });
    this.save = page.getByRole("button", { name: "Opslaan" });
  }
}

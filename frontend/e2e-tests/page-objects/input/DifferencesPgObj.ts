import { type Locator, type Page } from "@playwright/test";

import { InputBasePage } from "./InputBasePgObj";

export class DifferencesPage extends InputBasePage {
  readonly next: Locator;

  constructor(page: Page) {
    super(page);

    this.next = page.getByRole("button", { name: "Volgende" });
  }
}

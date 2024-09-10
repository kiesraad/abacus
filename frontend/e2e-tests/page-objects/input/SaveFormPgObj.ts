import { type Locator, type Page } from "@playwright/test";

import { InputBasePage } from "./InputBasePgObj";

export class SaveFormPage extends InputBasePage {
  readonly heading: Locator;
  readonly save: Locator;

  constructor(page: Page) {
    super(page);

    this.heading = page.getByRole("heading", { level: 2, name: "Controleren en opslaan" });

    this.save = page.getByRole("button", { name: "Opslaan" });
  }
}

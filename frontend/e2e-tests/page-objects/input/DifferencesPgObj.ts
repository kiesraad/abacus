import { type Locator, type Page } from "@playwright/test";

import { InputBasePage } from "./InputBasePgObj";

export class DifferencesPage extends InputBasePage {
  readonly heading: Locator;
  readonly next: Locator;

  constructor(page: Page) {
    super(page);

    this.heading = page.getByRole("heading", {
      level: 2,
      name: "Verschil tussen aantal kiezers en getelde stemmen",
    });

    this.next = page.getByRole("button", { name: "Volgende" });
  }
}

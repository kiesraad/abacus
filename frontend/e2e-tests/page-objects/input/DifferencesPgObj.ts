import { type Locator, type Page } from "@playwright/test";

import { InputBasePage } from "./InputBasePgObj";

export class DifferencesPage extends InputBasePage {
  readonly heading: Locator;
  readonly next: Locator;

  constructor(page: Page) {
    super(page);

    this.heading = page.getByRole("heading", {
      level: 2,
      name: "Verschillen tussen toegelaten kiezers en uitgebrachte stemmen",
    });

    this.next = page.getByRole("button", { name: "Volgende" });
  }
}

import { type Locator, type Page } from "@playwright/test";

import { InputBasePage } from "./InputBasePage";

export class RecountedPage extends InputBasePage {
  readonly nee: Locator;
  readonly volgende: Locator;

  constructor(page: Page) {
    super(page);
    this.nee = page.getByRole("radio", { name: "Nee, er was geen hertelling" });
    this.volgende = page.getByRole("button", { name: "Volgende" });
  }
}

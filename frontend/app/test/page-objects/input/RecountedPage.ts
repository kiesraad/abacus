import { type Locator, type Page } from "@playwright/test";

import { InputBasePage } from "./InputBasePage";

export class RecountedPage extends InputBasePage {
  readonly no: Locator;
  readonly volgende: Locator;

  constructor(page: Page) {
    super(page);
    // this.no = page.getByRole("radio", { name: "not-recounted"})
    this.no = page.getByLabel("Nee, er was geen hertelling");
    this.volgende = page.getByRole("button", { name: "Volgende" });
  }
}

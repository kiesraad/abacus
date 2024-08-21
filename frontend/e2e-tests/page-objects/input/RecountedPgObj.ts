import { type Locator, type Page } from "@playwright/test";

import { InputBasePage } from "./InputBasePgObj";

export class RecountedPage extends InputBasePage {
  readonly heading: Locator;

  readonly no: Locator;
  readonly next: Locator;
  readonly yes: Locator;

  constructor(page: Page) {
    super(page);

    this.heading = page.getByRole("heading", { level: 2, name: "Is er herteld?" });

    this.yes = page.getByRole("radio", { name: "Ja, er was een hertelling" });
    this.no = page.getByRole("radio", { name: "Nee, er was geen hertelling" });
    this.next = page.getByRole("button", { name: "Volgende" });
  }

  async waitForPageHeading() {
    await this.heading.waitFor();
  }
}

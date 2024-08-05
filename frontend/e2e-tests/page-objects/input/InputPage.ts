import { type Locator, type Page } from "@playwright/test";

export class InputPage {
  protected readonly page: Page;
  readonly stembureauNummmer: Locator;
  readonly pollingStationFeedback: Locator;
  protected readonly beginnen: Locator; // use clickBeginnen() instead

  constructor(page: Page) {
    this.page = page;
    this.stembureauNummmer = page.getByRole("textbox", { name: "Voer het nummer in: " });
    this.pollingStationFeedback = page.getByTestId("pollingStationSelectorFeedback");
    this.beginnen = page.getByRole("button", { name: "Beginnen" });
  }

  async clickBeginnen() {
    const button = this.page.getByRole("button", { name: "Beginnen" });
    // click() fails on Safari because element is visible and enabled, but not stable
    // so added timeout to make it fail fast
    await button.click({ timeout: 2000 });
  }
}

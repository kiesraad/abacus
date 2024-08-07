import { type Locator, type Page } from "@playwright/test";

export class InputPage {
  protected readonly page: Page;
  readonly pollingstationNumber: Locator;
  readonly pollingStationFeedback: Locator;
  protected readonly start: Locator; // use clickStart() instead

  constructor(page: Page) {
    this.page = page;

    this.pollingstationNumber = page.getByRole("textbox", { name: "Voer het nummer in: " });
    this.pollingStationFeedback = page.getByTestId("pollingStationSelectorFeedback");
    this.start = page.getByRole("button", { name: "Beginnen" });
  }

  async clickStart() {
    const button = this.page.getByRole("button", { name: "Beginnen" });
    // click() fails on Safari because element is visible and enabled, but not stable
    // so added timeout to make it fail fast
    await button.click({ timeout: 2000 });
  }
}

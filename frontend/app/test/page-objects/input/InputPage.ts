import { type Locator, type Page } from "@playwright/test";

export class InputPage {
  protected readonly page: Page;
  readonly pollingStation: Locator;
  readonly pollingStationFeedback: Locator;
  protected readonly beginnen: Locator; // use clickBeginnen() instead

  constructor(page: Page) {
    this.page = page;
    this.pollingStation = page.getByTestId("pollingStation");
    this.pollingStationFeedback = page.getByTestId("pollingStationSelectorFeedback");
    this.beginnen = page.getByRole("button", { name: "Beginnen" });
  }

  async clickBeginnen() {
    const button = this.page.getByRole("button", { name: "Beginnen" });

    // await button.waitFor();
    // await expect(button).toBeVisible();
    // await expect(button).toBeEnabled();

    // click() fails on Safari because  waiting for element to be visible, enabled and stable
    // element is visible and enabled, so issue is with the stable
    // so added timeout to make it fail fast
    await button.click({ timeout: 2000 });
  }
}

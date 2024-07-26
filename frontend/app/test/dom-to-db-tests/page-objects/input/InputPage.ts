import { expect, type Page } from "@playwright/test";

export class InputPage {
  protected readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async selectPollingStationThroughInputField(
    pollingStationNumber: string,
    pollingStationName: string,
  ) {
    await this.enterPollingStation(pollingStationNumber);
    await expect(this.getPollingStationFeedback()).toHaveText(pollingStationName);
    await this.clickBeginnen();
  }

  async enterPollingStation(pollingStation: string) {
    await this.page.getByTestId("pollingStation").fill(pollingStation);
  }

  getPollingStationFeedback() {
    return this.page.getByTestId("pollingStationSelectorFeedback");
  }

  async clickBeginnen() {
    const button = this.page.getByRole("button", { name: "Beginnen" });
    await button.waitFor();
    await expect(button).toBeVisible();
    await expect(button).toBeEnabled();
    // click() fails on Safari because  waiting for element to be visible, enabled and stable
    // element is visible and enabled, so issue is with the stable
    // so added timeout to make it fail fast
    await button.click({ timeout: 2000 });
  }
}

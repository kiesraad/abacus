import { type Locator, type Page } from "@playwright/test";

export class InputPage {
  protected readonly page: Page;

  readonly heading: Locator;
  readonly pollingStationNumber: Locator;
  readonly pollingStationFeedback: Locator;
  protected readonly start: Locator; // use clickStart() instead
  readonly dataEntrySuccess: Locator;

  constructor(page: Page) {
    this.page = page;

    this.heading = page.getByRole("heading", {
      level: 2,
      name: "Welk stembureau ga je invoeren?",
    });

    this.pollingStationNumber = page.getByRole("textbox", { name: "Voer het nummer in: " });
    this.pollingStationFeedback = page.getByTestId("pollingStationSelectorFeedback");
    this.start = page.getByRole("button", { name: "Beginnen" });

    this.dataEntrySuccess = page.getByRole("heading", {
      level: 2,
      name: "Je invoer is opgeslagen",
    });
  }

  async clickStart() {
    const button = this.page.getByRole("button", { name: "Beginnen" });
    // click() fails on Safari because element is visible and enabled, but not stable
    // so added timeout to make it fail fast
    await button.click({ timeout: 2000 });
  }

  async selectPollingStationAndClickStart(pollingStationNumber: number) {
    await this.pollingStationNumber.fill(pollingStationNumber.toString());
    await this.clickStart();
  }
}

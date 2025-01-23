import { type Locator, type Page } from "@playwright/test";

export class PollingStationChoicePage {
  readonly fieldset: Locator;
  readonly fieldsetNextPollingStation: Locator;
  readonly pollingStationNumber: Locator;
  readonly pollingStationFeedback: Locator;
  readonly pollingStationSubmitFeedback: Locator;
  protected readonly start: Locator; // use clickStart() instead
  readonly alertInputSaved: Locator;
  readonly dataEntrySuccess: Locator;
  readonly resumeDataEntry: Locator;

  constructor(protected readonly page: Page) {
    this.fieldset = page.getByRole("group", {
      name: "Welk stembureau ga je invoeren?",
    });

    this.fieldsetNextPollingStation = page.getByRole("group", {
      name: "Verder met een volgend stembureau?",
    });

    this.pollingStationNumber = page.getByRole("textbox", { name: "Voer het nummer in: " });
    this.pollingStationFeedback = page.getByTestId("pollingStationSelectorFeedback");
    this.pollingStationSubmitFeedback = page.getByTestId("pollingStationSubmitFeedback");
    this.start = page.getByRole("button", { name: "Beginnen" });

    this.dataEntrySuccess = page.getByRole("heading", {
      level: 2,
      name: "Je invoer is opgeslagen",
    });
    this.resumeDataEntry = page.getByRole("heading", { level: 2, name: "Je hebt nog een openstaande invoer" });

    this.alertInputSaved = page.getByRole("alert").filter({ has: this.dataEntrySuccess });
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

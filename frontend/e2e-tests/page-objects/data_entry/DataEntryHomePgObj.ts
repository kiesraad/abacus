import { expect, type Locator, type Page } from "@playwright/test";

import { PollingStation } from "@/types/generated/openapi";

export class DataEntryHomePage {
  readonly fieldset: Locator;
  readonly fieldsetNextPollingStation: Locator;
  readonly pollingStationNumber: Locator;
  readonly pollingStationFeedback: Locator;
  readonly pollingStationSubmitFeedback: Locator;
  readonly dataEntrySaved: Locator;
  readonly dataEntryDifferent: Locator;
  readonly dataEntryErrors: Locator;
  readonly dataEntryWarning: Locator;
  readonly resumeDataEntry: Locator;
  readonly alertDataEntrySaved: Locator;
  readonly alertDataEntryDifferent: Locator;
  readonly alertDataEntryErrors: Locator;
  readonly alertDataEntryWarning: Locator;
  readonly alertDataEntryInProgress: Locator;
  readonly allDataEntriesInProgress: Locator;

  protected readonly start: Locator; // use clickStart() instead

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

    this.dataEntrySaved = page.getByRole("heading", {
      level: 2,
      name: "Je invoer is opgeslagen",
    });
    this.dataEntryDifferent = page.getByRole("heading", {
      level: 2,
      name: "Let op: verschil met eerste invoer",
    });
    this.dataEntryErrors = page.getByRole("heading", {
      level: 2,
      name: "Let op: fouten in het proces-verbaal",
    });
    this.dataEntryWarning = page.getByRole("heading", {
      level: 2,
      name: /^Je kan stembureau \d+ niet invoeren$/,
    });
    this.resumeDataEntry = page.getByRole("heading", { level: 2, name: "Je hebt nog een openstaande invoer" });

    this.alertDataEntrySaved = page.getByRole("alert").filter({ has: this.dataEntrySaved });

    this.alertDataEntryDifferent = page.getByRole("alert").filter({ has: this.dataEntryDifferent });

    this.alertDataEntryErrors = page.getByRole("alert").filter({ has: this.dataEntryErrors });

    this.alertDataEntryWarning = page.getByRole("alert").filter({ has: this.dataEntryWarning });

    this.alertDataEntryInProgress = page.getByRole("alert").filter({ has: this.resumeDataEntry });

    this.allDataEntriesInProgress = this.alertDataEntryInProgress.getByRole("link");
  }

  async clickStart() {
    const button = this.page.getByRole("button", { name: "Beginnen" });
    // click() fails on Safari because element is visible and enabled, but not stable
    // so added timeout to make it fail fast
    await button.click({ timeout: 2000 });
  }

  async selectPollingStationAndClickStart(pollingStation: PollingStation) {
    await this.pollingStationNumber.pressSequentially(pollingStation.number.toString(), { delay: 50 });
    await expect(this.pollingStationFeedback).toContainText(pollingStation.name);
    await this.clickStart();
  }

  async clickDataEntryInProgress(pollingStationNumber: number, pollingStationName: string) {
    const dataEntryLink = this.alertDataEntryInProgress.getByRole("link", {
      name: `${pollingStationNumber} - ${pollingStationName}`,
    });
    await dataEntryLink.click();
  }
}

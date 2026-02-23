import { expect, type Locator, type Page } from "@playwright/test";

import type { PollingStation } from "@/types/generated/openapi";

export class DataEntryHomePage {
  readonly fieldset: Locator;
  readonly fieldsetNextPollingStation: Locator;
  readonly pollingStationNumber: Locator;
  readonly pollingStationFeedback: Locator;
  readonly pollingStationSubmitFeedback: Locator;
  readonly alert: Locator;
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
    this.pollingStationFeedback = page.getByTestId("pollingStationNumberInputFeedback");
    this.pollingStationSubmitFeedback = page.getByTestId("pollingStationSubmitFeedback");
    this.start = page.getByRole("button", { name: "Beginnen" });

    this.alert = page.getByRole("alert");
    this.alertDataEntrySaved = this.alert.filter({ hasText: "Je invoer is opgeslagen" });
    this.alertDataEntryDifferent = this.alert.filter({ hasText: "Let op: verschil met eerste invoer" });
    this.alertDataEntryErrors = this.alert.filter({ hasText: "Let op: fouten in het proces-verbaal" });
    this.alertDataEntryWarning = this.alert.filter({ hasText: /^Je kan stembureau \d+ niet invoeren/ });
    this.alertDataEntryInProgress = this.alert.filter({ hasText: "Je hebt nog een openstaande invoer" });
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

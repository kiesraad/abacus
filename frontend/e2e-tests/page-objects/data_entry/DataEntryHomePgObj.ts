import { expect, type Locator, type Page } from "@playwright/test";

export class DataEntryHomePage {
  readonly fieldset: Locator;
  readonly fieldsetContinueNext: Locator;
  readonly number: Locator;
  readonly feedback: Locator;
  readonly submitFeedback: Locator;
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

    this.fieldsetContinueNext = page.getByRole("group", {
      name: "Verder met een volgend stembureau?",
    });

    this.number = page.getByRole("textbox", { name: "Voer het nummer in: " });
    this.feedback = page.getByTestId("inputFeedback");
    this.submitFeedback = page.getByTestId("submitFeedback");
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

  async enterNumberAndClickStart(dataEntrySource: { number: number; name: string }) {
    await this.number.pressSequentially(dataEntrySource.number.toString(), { delay: 50 });
    await expect(this.feedback).toContainText(dataEntrySource.name);
    await this.clickStart();
  }

  async clickDataEntryInProgress(dataEntrySource: { number: number; name: string }) {
    const dataEntryLink = this.alertDataEntryInProgress.getByRole("link", {
      name: `${dataEntrySource.number} - ${dataEntrySource.name}`,
    });
    await dataEntryLink.click();
  }
}

import type { Locator, Page } from "@playwright/test";

export class ElectionStatus {
  readonly header: Locator;
  readonly finish: Locator;
  readonly errorsAndWarnings: Locator;
  readonly inProgress: Locator;
  readonly firstEntryFinished: Locator;
  readonly definitive: Locator;
  readonly notStarted: Locator;
  readonly differencesResolved: Locator;
  readonly firstDataEntryResumed: Locator;
  readonly firstDataEntryDiscarded: Locator;
  readonly alertDifferencesResolved: Locator;
  readonly alertFirstDataEntryResumed: Locator;
  readonly alertFirstDataEntryDiscarded: Locator;

  constructor(protected readonly page: Page) {
    this.header = page.getByRole("heading", { level: 1 });
    this.finish = page.getByRole("button", { name: "Invoerfase afronden" });
    this.errorsAndWarnings = page.getByRole("table", { name: "Fouten en waarschuwingen" });
    this.inProgress = page.getByRole("table", { name: "Invoer bezig" });
    this.firstEntryFinished = page.getByRole("table", { name: "Eerste invoer klaar" });
    this.definitive = page.getByRole("table", { name: "Eerste en tweede invoer klaar" });
    this.notStarted = page.getByRole("table", { name: "Werkvoorraad" });

    this.differencesResolved = page.getByRole("strong").filter({
      hasText: /Verschil opgelost voor stembureau \d+/,
    });
    this.firstDataEntryResumed = page.getByRole("strong").filter({
      hasText: /Stembureau \d+ teruggegeven aan \w+/,
    });
    this.firstDataEntryDiscarded = page.getByRole("strong").filter({
      hasText: /^Invoer stembureau \d+ verwijderd$/,
    });

    this.alertDifferencesResolved = page.getByRole("alert").filter({ has: this.differencesResolved });

    this.alertFirstDataEntryResumed = page.getByRole("alert").filter({ has: this.firstDataEntryResumed });

    this.alertFirstDataEntryDiscarded = page.getByRole("alert").filter({ has: this.firstDataEntryDiscarded });
  }
}

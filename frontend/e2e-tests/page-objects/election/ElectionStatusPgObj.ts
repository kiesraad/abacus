import { type Locator, type Page } from "@playwright/test";

export class ElectionStatus {
  readonly finish: Locator;
  readonly errorsAndWarnings: Locator;
  readonly inProgress: Locator;
  readonly firstEntryFinished: Locator;
  readonly definitive: Locator;
  readonly notStarted: Locator;
  readonly firstDataEntryKept: Locator;
  readonly secondDataEntryKept: Locator;
  readonly dataEntriesDiscarded: Locator;
  readonly firstDataEntryResumed: Locator;
  readonly firstDataEntryDiscarded: Locator;
  readonly alertFirstDataEntryKept: Locator;
  readonly alertSecondDataEntryKept: Locator;
  readonly alertDataEntriesDiscarded: Locator;
  readonly alertFirstDataEntryResumed: Locator;
  readonly alertFirstDataEntryDiscarded: Locator;

  constructor(protected readonly page: Page) {
    this.finish = page.getByRole("button", { name: "Invoerfase afronden" });
    this.errorsAndWarnings = page.getByRole("table", { name: "Fouten en waarschuwingen" });
    this.inProgress = page.getByRole("table", { name: "Invoer bezig" });
    this.firstEntryFinished = page.getByRole("table", { name: "Eerste invoer klaar" });
    this.definitive = page.getByRole("table", { name: "Eerste en tweede invoer klaar" });
    this.notStarted = page.getByRole("table", { name: "Werkvoorraad" });

    this.firstDataEntryKept = page.getByRole("heading", {
      level: 2,
      name: "Verschil opgelost door eerste invoer te bewaren",
    });
    this.secondDataEntryKept = page.getByRole("heading", {
      level: 2,
      name: "Verschil opgelost door tweede invoer te bewaren",
    });
    this.dataEntriesDiscarded = page.getByRole("heading", {
      level: 2,
      name: "Verschil opgelost door beide invoeren te verwijderen",
    });
    this.firstDataEntryResumed = page.getByRole("heading", {
      level: 2,
      name: /Stembureau \d+ teruggegeven aan \w+/,
    });
    this.firstDataEntryDiscarded = page.getByRole("heading", {
      level: 2,
      name: /^Invoer stembureau \d+ verwijderd$/,
    });

    this.alertFirstDataEntryKept = page.getByRole("alert").filter({ has: this.firstDataEntryKept });

    this.alertSecondDataEntryKept = page.getByRole("alert").filter({ has: this.secondDataEntryKept });

    this.alertDataEntriesDiscarded = page.getByRole("alert").filter({ has: this.dataEntriesDiscarded });

    this.alertFirstDataEntryResumed = page.getByRole("alert").filter({ has: this.firstDataEntryResumed });

    this.alertFirstDataEntryDiscarded = page.getByRole("alert").filter({ has: this.firstDataEntryDiscarded });
  }
}

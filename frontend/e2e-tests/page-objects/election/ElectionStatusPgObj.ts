import { type Locator, type Page } from "@playwright/test";

export class ElectionStatus {
  readonly finish: Locator;
  readonly errorsAndWarnings: Locator;
  readonly firstEntryFinished: Locator;
  readonly definitive: Locator;
  readonly notStarted: Locator;
  readonly firstDataEntryKept: Locator;
  readonly secondDataEntryKept: Locator;
  readonly dataEntriesDiscarded: Locator;
  readonly alertFirstDataEntryKept: Locator;
  readonly alertSecondDataEntryKept: Locator;
  readonly alertDataEntriesDiscarded: Locator;

  constructor(protected readonly page: Page) {
    this.finish = page.getByRole("button", { name: "Invoerfase afronden" });
    this.errorsAndWarnings = page.getByRole("table", { name: "Fouten en waarschuwingen" });
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

    this.alertFirstDataEntryKept = page.getByRole("alert").filter({ has: this.firstDataEntryKept });

    this.alertSecondDataEntryKept = page.getByRole("alert").filter({ has: this.secondDataEntryKept });

    this.alertDataEntriesDiscarded = page.getByRole("alert").filter({ has: this.dataEntriesDiscarded });
  }
}

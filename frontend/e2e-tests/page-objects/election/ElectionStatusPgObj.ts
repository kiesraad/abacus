import { type Locator, type Page } from "@playwright/test";

export class ElectionStatus {
  readonly finish: Locator;
  readonly errorsAndWarnings: Locator;
  readonly firstEntryFinished: Locator;
  readonly definitive: Locator;
  readonly notStarted: Locator;

  constructor(protected readonly page: Page) {
    this.finish = page.getByRole("button", { name: "Invoerfase afronden" });
    this.errorsAndWarnings = page.getByRole("table", { name: "Fouten en waarschuwingen" });
    this.firstEntryFinished = page.getByRole("table", { name: "Eerste invoer klaar" });
    this.definitive = page.getByRole("table", { name: "Eerste en tweede invoer klaar" });
    this.notStarted = page.getByRole("table", { name: "Werkvoorraad" });
  }
}

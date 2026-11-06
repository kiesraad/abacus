import type { Locator, Page } from "@playwright/test";

export class DataEntryImportCheckAndSavePgObj {
  readonly header: Locator;
  readonly description: Locator;
  readonly electionName: Locator;
  readonly committeeCategory: Locator;
  readonly areaDesignation: Locator;
  readonly saveButton: Locator;

  constructor(protected readonly page: Page) {
    this.header = page.getByRole("heading", { level: 2, name: "Controleren en opslaan" });
    this.description = page.getByText("Je gaat de volgende telresultaten importeren:");
    this.electionName = page.getByTestId("election-name");
    this.committeeCategory = page.getByTestId("committee-category");
    this.areaDesignation = page.getByTestId("area-designation");
    this.saveButton = page.getByRole("button", { name: "Opslaan" });
  }
}

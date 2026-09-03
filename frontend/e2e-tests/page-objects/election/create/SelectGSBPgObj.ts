import type { Locator, Page } from "@playwright/test";

export class SelectGSBPgObj {
  readonly header: Locator;
  readonly regions: Locator;

  constructor(protected readonly page: Page) {
    this.header = page.getByRole("heading", { level: 2, name: "Selecteer het gemeentelijk stembureau" });
    this.regions = page.getByTestId("region_list").locator("tbody").getByRole("row");
  }

  async clickRegionFromList(number: string) {
    await this.page.getByTestId(`region-${number}`).click();
  }
}

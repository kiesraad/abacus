import type { Locator, Page } from "@playwright/test";

export class SelectGSBPgObj {
  readonly header: Locator;
  readonly region_list: Locator;
  readonly regions: Locator;

  constructor(protected readonly page: Page) {
    this.header = page.getByRole("heading", { level: 2, name: "Selecteer het gemeentelijk stembureau" });
    this.region_list = page.getByTestId("region_list");
    this.regions = this.region_list.locator("tbody").getByRole("row");
  }

  async clickRegionFromList(number: string) {
    await this.region_list.getByTestId(`region-${number}`).click();
  }
}

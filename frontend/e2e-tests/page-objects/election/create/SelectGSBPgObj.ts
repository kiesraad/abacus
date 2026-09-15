import type { Locator, Page } from "@playwright/test";

export class SelectGSBPgObj {
  readonly header: Locator;
  readonly regionList: Locator;
  readonly regions: Locator;

  constructor(protected readonly page: Page) {
    this.header = page.getByRole("heading", { level: 2, name: "Selecteer het gemeentelijk stembureau" });
    this.regionList = page.getByTestId("region_list");
    this.regions = this.regionList.locator("tbody").getByRole("row");
  }

  async clickRegionFromList(number: string) {
    await this.regionList.getByTestId(`region-${number}`).click();
  }
}

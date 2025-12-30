import type { Locator, Page } from "@playwright/test";

export class CheckPollingStationDefinitionPgObj {
  readonly header: Locator;
  readonly showMore: Locator;
  readonly next: Locator;
  readonly table: Locator;
  readonly stations: Locator;

  constructor(protected readonly page: Page) {
    this.header = page.getByRole("heading", { level: 2, name: "Controleer stembureaus" });
    this.showMore = page.getByRole("button", { name: /Toon alle \d+ stembureaus/ });
    this.next = page.getByRole("button", { name: "Volgende" });
    this.table = page.getByTestId("overview");
    this.stations = this.table.locator("tbody").getByRole("row");
  }
}

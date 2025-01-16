import { type Locator, type Page } from "@playwright/test";

import { PollingStation } from "@kiesraad/api";

export class PollingStationFormPgObj {
  protected readonly page: Page;

  //required inputs
  readonly number: Locator;
  readonly name: Locator;

  readonly create: Locator;

  constructor(page: Page) {
    this.page = page;

    this.number = page.getByRole("textbox", { name: "Nummer", exact: true });
    this.name = page.getByRole("textbox", { name: "Naam", exact: true });

    this.create = page.getByRole("button", { name: "Opslaan en toevoegen" });
  }

  async fillIn(values: Partial<Pick<PollingStation, "number" | "name">>) {
    if (values.number !== undefined) {
      await this.number.fill(values.number.toString());
    }
    if (values.name) {
      await this.name.fill(values.name);
    }
  }
}

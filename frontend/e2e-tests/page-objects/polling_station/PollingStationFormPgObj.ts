import { type Locator, type Page } from "@playwright/test";

import { PollingStation } from "@/types/generated/openapi";

export class PollingStationFormPgObj {
  readonly number: Locator;
  readonly name: Locator;

  readonly create: Locator;

  constructor(protected readonly page: Page) {
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

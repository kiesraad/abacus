import { type Locator, type Page } from "@playwright/test";

export class ElectionCheckDefinitionPgObj {
  readonly header: Locator;
  readonly hash: Locator;

  constructor(protected readonly page: Page) {
    this.header = page.getByRole("heading", { level: 2, name: "Controleer verkiezingsdefinitie" });
    this.hash = page.getByTestId("hash");
  }
}

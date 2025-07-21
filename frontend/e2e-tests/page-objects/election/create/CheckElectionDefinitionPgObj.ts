import { expect, type Locator, type Page } from "@playwright/test";

export class CheckElectionDefinitionPgObj {
  readonly header: Locator;
  readonly hashInput1: Locator;
  readonly hashInput2: Locator;
  readonly next: Locator;
  readonly error: Locator;

  constructor(protected readonly page: Page) {
    this.header = page.getByRole("heading", { level: 2, name: "Controleer verkiezingsdefinitie" });
    this.hashInput1 = page.getByLabel("Controle deel 1");
    this.hashInput2 = page.getByLabel("Controle deel 2");
    this.next = page.getByRole("button", { name: "Volgende" });
    this.error = page.getByRole("heading", { level: 3, name: "Controle digitale vingerafdruk niet gelukt" });
  }

  async inputHash(hashInput1: string, hashInput2: string) {
    await expect(this.hashInput1).toBeFocused();
    await this.hashInput1.fill(hashInput1);
    await this.hashInput2.fill(hashInput2);
    await this.next.click();
  }
}

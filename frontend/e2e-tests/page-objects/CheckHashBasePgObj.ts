import { expect, type Locator, type Page } from "@playwright/test";

export class CheckHashBasePgObj {
  readonly hashInput1: Locator;
  readonly hashInput2: Locator;
  readonly next: Locator;
  readonly error: Locator;

  constructor(protected readonly page: Page) {
    this.hashInput1 = page.getByRole("textbox", { name: "Controle deel 1" });
    this.hashInput2 = page.getByRole("textbox", { name: "Controle deel 2" });
    this.next = page.getByRole("button", { name: "Volgende" });
    this.error = page.getByRole("strong").filter({ hasText: "Onjuiste vingerafdruk" });
  }

  async inputHash(hashInput1: string, hashInput2: string) {
    await expect(this.hashInput1).toBeFocused();
    await this.hashInput1.fill(hashInput1);
    await this.hashInput2.fill(hashInput2);
    await this.next.click();
  }

  // The redacted chunk positions are random, so look up which chunks to fill in from the input names
  async inputHashFrom(fullHash: string[]) {
    const indexFor = async (input: Locator) => {
      const name = await input.getAttribute("name");
      if (name === null || !/^\d+$/.test(name) || Number(name) >= fullHash.length) {
        throw new Error(`Hash input name "${name}" is not a valid chunk index`);
      }
      return Number(name);
    };
    const index1 = await indexFor(this.hashInput1);
    const index2 = await indexFor(this.hashInput2);
    if (index1 >= index2) {
      throw new Error(`Hash input indexes ${index1} and ${index2} are not distinct or not sorted`);
    }
    await this.inputHash(fullHash[index1] ?? "", fullHash[index2] ?? "");
  }
}

import { type Page } from "@playwright/test";

export class RecountedPage {
  protected readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async submitNotRecounted() {
    await this.checkNotRecounted();
    await this.clickVolgende();
  }

  async checkNotRecounted() {
    await this.page.getByTestId("no").check();
  }

  async clickVolgende() {
    await this.page.getByRole("button", { name: "Volgende" }).click();
  }
}

import { Locator, Page } from "@playwright/test";

export class ElectionHome {
  readonly downloadBijlage1: Locator;

  constructor(protected readonly page: Page) {
    this.downloadBijlage1 = page.getByRole("cell", { name: "Na 31-2 Bijlage 1" });
  }
}

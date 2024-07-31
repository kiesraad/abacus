import { type Locator, type Page } from "@playwright/test";

export class RecountedPage {
  protected readonly page: Page;
  readonly no: Locator;
  readonly volgende: Locator;

  constructor(page: Page) {
    this.page = page;
    // this.no = page.getByRole("radio", { name: "not-recounted"})
    this.no = page.getByLabel("Nee, er was geen hertelling");
    this.volgende = page.getByRole("button", { name: "Volgende" });
  }
}

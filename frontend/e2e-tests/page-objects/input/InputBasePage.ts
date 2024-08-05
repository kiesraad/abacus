import { type Locator, type Page } from "@playwright/test";

export class InputBasePage {
  protected readonly page: Page;
  readonly error: Locator;
  readonly warning: Locator;
  readonly verschillen: Locator;

  constructor(page: Page) {
    this.page = page;
    this.error = page.getByTestId("feedback-error");
    this.warning = page.getByTestId("feedback-warning");

    this.verschillen = page.getByText("Verschillen");
  }

  async clickPoliticalGroup(politicalGroup: string) {
    await this.page.getByText(politicalGroup).click();
  }
}

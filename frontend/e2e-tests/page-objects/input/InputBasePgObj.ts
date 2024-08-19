import { type Locator, type Page } from "@playwright/test";

export class InputBasePage {
  protected readonly page: Page;
  readonly heading: Locator;
  readonly error: Locator;
  readonly warning: Locator;

  readonly navVotersAndVotes: Locator;

  constructor(page: Page) {
    this.page = page;

    this.heading = page.locator("h2");

    this.error = page.getByTestId("feedback-error");
    this.warning = page.getByTestId("feedback-warning");

    this.navVotersAndVotes = page.locator("li").filter({ hasText: "Aantal kiezers en stemmen" });
  }
}

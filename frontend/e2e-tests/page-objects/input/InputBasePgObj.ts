import { type Locator, type Page } from "@playwright/test";

export class InputBasePage {
  protected readonly page: Page;
  readonly error: Locator;
  readonly warning: Locator;
  readonly votersAndVotes: Locator;
  readonly differences: Locator;

  constructor(page: Page) {
    this.page = page;

    this.error = page.getByTestId("feedback-error");
    this.warning = page.getByTestId("feedback-warning");

    this.votersAndVotes = page.getByText("Aantal kiezers en stemmen");
    this.differences = page.getByText("Verschillen");
  }

  async clickPoliticalGroup(politicalGroup: string) {
    await this.page.getByText(politicalGroup).click();
  }
}

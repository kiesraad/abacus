import { type Locator, type Page } from "@playwright/test";

export class InputBasePage {
  protected readonly page: Page;
  readonly heading: Locator;

  readonly error: Locator;
  readonly warning: Locator;

  readonly navRecounted: Locator;
  readonly navVotersAndVotes: Locator;

  readonly modalSaveDiscardInput: Locator;
  readonly modalHeading: Locator;
  readonly saveInput: Locator;
  readonly discardInput: Locator;

  constructor(page: Page) {
    this.page = page;

    this.heading = page.getByRole("heading", { level: 2 });

    this.error = page.getByTestId("feedback-error");
    this.warning = page.getByTestId("feedback-warning");

    this.navRecounted = page.locator("li").filter({ hasText: "Is er herteld?" });
    this.navVotersAndVotes = page.locator("li").filter({ hasText: "Aantal kiezers en stemmen" });

    this.modalSaveDiscardInput = page.getByRole("dialog");
    this.modalHeading = this.modalSaveDiscardInput.getByRole("heading", { level: 2 });
    this.saveInput = this.modalSaveDiscardInput.getByRole("button", { name: "Invoer bewaren" });
    this.discardInput = this.modalSaveDiscardInput.getByRole("button", { name: "Niet bewaren" });
  }
}

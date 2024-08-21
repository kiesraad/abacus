import { type Locator, type Page } from "@playwright/test";

import { SaveDiscardInputModal } from "./SaveDiscardModalPgObj";

export class InputBasePage {
  protected readonly page: Page;

  readonly saveDiscardModal: SaveDiscardInputModal;

  readonly error: Locator;
  readonly warning: Locator;

  readonly navRecounted: Locator;
  readonly navVotersAndVotes: Locator;

  constructor(page: Page) {
    this.page = page;

    this.saveDiscardModal = new SaveDiscardInputModal(page);

    this.error = page.getByTestId("feedback-error");
    this.warning = page.getByTestId("feedback-warning");

    this.navRecounted = page.locator("li").filter({ hasText: "Is er herteld?" });
    this.navVotersAndVotes = page.locator("li").filter({ hasText: "Aantal kiezers en stemmen" });
  }
}

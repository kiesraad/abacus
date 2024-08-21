import { type Locator, type Page } from "@playwright/test";

import { NavigationPanel } from "./NavigationPanelPgObj";
import { SaveDiscardInputModal } from "./SaveDiscardModalPgObj";

export class InputBasePage {
  protected readonly page: Page;

  readonly saveDiscardModal: SaveDiscardInputModal;
  readonly navPanel: NavigationPanel;

  readonly error: Locator;
  readonly warning: Locator;

  constructor(page: Page) {
    this.page = page;

    this.saveDiscardModal = new SaveDiscardInputModal(page);
    this.navPanel = new NavigationPanel(page);

    this.error = page.getByTestId("feedback-error");
    this.warning = page.getByTestId("feedback-warning");
  }
}

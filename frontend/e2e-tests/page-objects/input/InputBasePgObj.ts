import { type Locator, type Page } from "@playwright/test";

import { NavigationPanel } from "./NavigationPanelPgObj";
import { UnsavedChangesModal } from "./UnsavedChangesModalPgObj";

export class InputBasePage {
  protected readonly page: Page;

  readonly unsavedChangesModal: UnsavedChangesModal;
  readonly navPanel: NavigationPanel;

  readonly abortInput: Locator;

  readonly error: Locator;
  readonly warning: Locator;

  constructor(page: Page) {
    this.page = page;

    this.unsavedChangesModal = new UnsavedChangesModal(page);
    this.navPanel = new NavigationPanel(page);

    this.abortInput = page.getByRole("button", { name: "Invoer afbreken" });

    this.error = page.getByTestId("feedback-error");
    this.warning = page.getByTestId("feedback-warning");
  }
}

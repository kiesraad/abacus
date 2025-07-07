import { type Locator, type Page } from "@playwright/test";

import { NavBar } from "../NavBarPgObj";
import { ProgressList } from "./ProgressListPgObj";
import { UnsavedChangesModal } from "./UnsavedChangesModalPgObj";

export class DataEntryBasePage {
  readonly navBar: NavBar;
  readonly unsavedChangesModal: UnsavedChangesModal;
  readonly progressList: ProgressList;

  readonly abortInput: Locator;

  readonly error: Locator;
  readonly warning: Locator;
  readonly feedbackHeader: Locator;

  constructor(protected readonly page: Page) {
    this.navBar = new NavBar(page);
    this.unsavedChangesModal = new UnsavedChangesModal(page);
    this.progressList = new ProgressList(page);

    this.abortInput = page.getByRole("button", { name: "Invoer afbreken" });

    this.error = page.getByTestId("feedback-error");
    this.warning = page.getByTestId("feedback-warning");
    this.feedbackHeader = page.getByRole("heading", { level: 3 });
  }
}

import { type Locator, type Page } from "@playwright/test";

import { DataEntryBasePage } from "./DataEntryBasePgObj";

export class CheckAndSavePage extends DataEntryBasePage {
  readonly fieldset: Locator;
  readonly summaryText: Locator;
  readonly summaryList: Locator;
  readonly save: Locator;

  constructor(page: Page) {
    super(page);

    this.fieldset = page.getByRole("group", { name: "Controleren en opslaan" });
    this.summaryText = page.getByTestId("save-form-summary-text");
    this.summaryList = page.getByTestId("save-form-summary-list");
    this.save = page.getByRole("button", { name: "Opslaan" });
  }

  allSummaryListItems() {
    return this.summaryList.getByRole("listitem");
  }

  summaryListItemIcon(text: string) {
    return this.summaryList.locator("li", { hasText: text }).getByRole("img");
  }
}

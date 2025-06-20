import { type Locator, type Page } from "@playwright/test";

import { DataEntryBasePage } from "./DataEntryBasePgObj";

export class CheckAndSavePage extends DataEntryBasePage {
  readonly fieldset: Locator;
  readonly summaryText: Locator;
  readonly summaryList: Locator;
  readonly save: Locator;
  readonly complete: Locator;
  readonly acceptErrorsReminder: Locator;
  readonly acceptErrors: Locator;

  constructor(page: Page) {
    super(page);

    this.fieldset = page.getByRole("group", { name: "Controleren en opslaan" });
    this.summaryText = page.getByTestId("save-form-summary-text");
    this.summaryList = page.getByTestId("save-form-summary-list");
    this.save = page.getByRole("button", { name: "Opslaan" });
    this.complete = page.getByRole("button", { name: "Afronden" });
    this.acceptErrorsReminder = page
      .getByRole("alert")
      .filter({ hasText: "Je kan alleen verder als je dit met de coördinator hebt overlegd." });
    this.acceptErrors = page.getByLabel("Ik heb de fouten besproken met de coördinator");
  }

  allSummaryListItems() {
    return this.summaryList.getByRole("listitem");
  }

  summaryListItemIcon(text: string) {
    return this.summaryList.locator("li", { hasText: text }).getByRole("img");
  }
}

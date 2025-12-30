import type { Locator, Page } from "@playwright/test";

import { DataEntryBasePage } from "./DataEntryBasePgObj";

export class CheckAndSavePage extends DataEntryBasePage {
  readonly fieldset: Locator;
  readonly summaryText: Locator;
  readonly summaryList: Locator;
  readonly summaryListItemVotersAndVotes: Locator;
  readonly summaryListItemDifferences: Locator;
  readonly summaryListItemPoliticalGroupCandidateVotes1: Locator;
  readonly summaryListItemPoliticalGroupCandidateVotes2: Locator;
  readonly save: Locator;
  readonly complete: Locator;
  readonly acceptErrorsReminder: Locator;
  readonly acceptErrors: Locator;

  constructor(page: Page) {
    super(page);

    this.fieldset = page.getByRole("group", { name: "Controleren en opslaan" });

    this.summaryText = page.getByTestId("save-form-summary-text");
    this.summaryList = page.getByTestId("save-form-summary-list");
    this.summaryListItemVotersAndVotes = page
      .getByTestId("save-form-summary-list-voters_votes_counts")
      .getByRole("listitem");
    this.summaryListItemDifferences = page
      .getByTestId("save-form-summary-list-differences_counts")
      .getByRole("listitem");
    this.summaryListItemPoliticalGroupCandidateVotes1 = page
      .getByTestId("save-form-summary-list-political_group_votes_1")
      .getByRole("listitem");
    this.summaryListItemPoliticalGroupCandidateVotes2 = page
      .getByTestId("save-form-summary-list-political_group_votes_2")
      .getByRole("listitem");

    this.save = page.getByRole("button", { name: "Opslaan" });
    this.complete = page.getByRole("button", { name: "Afronden" });

    this.acceptErrorsReminder = page
      .getByRole("alert")
      .filter({ hasText: "Je kan alleen verder als je dit met de coördinator hebt overlegd." });
    this.acceptErrors = page.getByRole("checkbox", { name: "Ik heb de fouten besproken met de coördinator" });
  }

  allSummaryListItems() {
    return this.summaryList.getByRole("listitem");
  }

  summaryListItemIcon(text: string) {
    return this.summaryList.locator("li", { hasText: text }).getByRole("img");
  }
}

import { type Locator, type Page } from "@playwright/test";

import { DataEntryBasePage } from "./DataEntryBasePgObj";

export class CandidatesListPage extends DataEntryBasePage {
  readonly fieldset: Locator;

  readonly next: Locator;
  readonly total: Locator;

  constructor(page: Page, listName: string) {
    super(page);

    this.fieldset = page.getByRole("group", { name: listName });

    this.total = page.getByTestId("total");
    this.next = page.getByRole("button", { name: "Volgende" });
  }

  getCandidate(index: number) {
    return this.page.getByTestId(`candidate_votes[${index}].votes`);
  }

  async fillCandidate(index: number, count: number) {
    await this.getCandidate(index).fill(count.toString());
  }

  async fillCandidatesAndTotal(votes: number[], total: number) {
    for (const [index, count] of votes.entries()) {
      await this.fillCandidate(index, count);
    }

    await this.total.fill(total.toString());
  }
}

import { type Locator, type Page } from "@playwright/test";

import { DataEntryBasePage } from "./DataEntryBasePgObj";

export class CandidatesListPage extends DataEntryBasePage {
  private pgNumber: number;

  readonly fieldset: Locator;

  readonly next: Locator;
  readonly total: Locator;

  constructor(page: Page, pgNumber: number, pgName: string) {
    super(page);

    this.pgNumber = pgNumber;
    this.fieldset = page.getByRole("group", { name: pgName });

    this.total = page.getByRole("textbox", { name: "Totaal" });
    this.next = page.getByRole("button", { name: "Volgende" });
  }

  getCandidate(index: number) {
    return this.page.getByTestId(`data.political_group_votes[${this.pgNumber - 1}].candidate_votes[${index}].votes`);
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

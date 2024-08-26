import { type Locator, type Page } from "@playwright/test";

import { InputBasePage } from "./InputBasePgObj";

export class CandidatesListPage extends InputBasePage {
  readonly heading: Locator;

  readonly next: Locator;
  readonly total: Locator;

  constructor(page: Page, listName: string) {
    super(page);

    this.heading = page.getByRole("heading", { level: 2, name: listName });

    this.total = page.getByTestId("total");
    this.next = page.getByRole("button", { name: "Volgende" });
  }

  async fillCandidate(index: number, count: number) {
    await this.page.getByTestId(`candidate_votes[${index}].votes`).fill(count.toString());
  }

  async fillCandidatesAndTotal(votes: number[], total: number) {
    for (const [index, count] of votes.entries()) {
      await this.fillCandidate(index, count);
    }

    await this.total.fill(total.toString());
  }
}

import { type Locator, type Page } from "@playwright/test";

import { InputBasePage } from "./InputBasePgObj";

export class CandidatesListPage extends InputBasePage {
  readonly next: Locator;
  readonly total: Locator;

  constructor(page: Page) {
    super(page);

    this.total = page.getByTestId("total");
    this.next = page.getByRole("button", { name: "Volgende" });
  }

  async fillCandidate(index: number, count: number) {
    await this.page.getByTestId(`candidate_votes[${index}].votes`).fill(count.toString());
  }
}

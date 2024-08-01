import { type Locator, type Page } from "@playwright/test";

import { InputBasePage } from "./InputBasePage";

export class CandidatesListPage extends InputBasePage {
  readonly volgende: Locator;
  readonly total: Locator;

  constructor(page: Page) {
    super(page);

    this.total = page.getByTestId("total");
    this.volgende = page.getByRole("button", { name: "Volgende" });
  }

  async fillCandidate(index: number, count: number) {
    await this.page.getByTestId(`candidate_votes[${index}].votes`).fill(count.toString());
  }
}

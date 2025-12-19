import { type Locator, type Page } from "@playwright/test";

import { DataEntryBasePage } from "./DataEntryBasePgObj";

export class CandidatesListPage extends DataEntryBasePage {
  private pgIndex: number;

  readonly fieldset: Locator;

  readonly next: Locator;
  readonly total: Locator;

  readonly acceptErrorsAndWarnings: Locator;
  readonly acceptErrorsAndWarningsReminder: Locator;

  constructor(page: Page, pgIndex: number, pgName: string) {
    super(page);

    this.pgIndex = pgIndex;
    this.fieldset = page.getByRole("group", { name: pgName });

    this.total = page.getByRole("textbox", { name: "Totaal" });
    this.next = page.getByRole("button", { name: "Volgende" });

    this.acceptErrorsAndWarnings = page.getByRole("checkbox", {
      name: "Ik heb mijn invoer gecontroleerd met het papier en correct overgenomen.",
    });
    this.acceptErrorsAndWarningsReminder = page
      .getByRole("alert")
      .filter({ hasText: "Je kan alleen verder als je het papieren proces-verbaal hebt gecontroleerd." });
  }

  getCandidate(index: number) {
    return this.page.getByTestId(`data.political_group_votes[${this.pgIndex}].candidate_votes[${index}].votes`);
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

  async checkAcceptErrorsAndWarnings() {
    await this.acceptErrorsAndWarnings.waitFor();
    await this.acceptErrorsAndWarnings.check();
  }
}

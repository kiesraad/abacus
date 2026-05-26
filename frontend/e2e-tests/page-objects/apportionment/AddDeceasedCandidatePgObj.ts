import type { Locator, Page } from "@playwright/test";

export class AddDeceasedCandidate {
  readonly header: Locator;
  readonly title: Locator;
  readonly candidates: Locator;

  constructor(protected readonly page: Page) {
    this.header = page.getByRole("heading", { level: 1, name: "Overleden kandidaat" });
    this.title = page.getByRole("heading", { level: 3 });

    this.candidates = page.getByTestId("candidates").locator("tbody").getByRole("row");
  }

  async clickCandidateFromList(candidateNumber: number) {
    await this.page.getByTestId(`candidate-${candidateNumber}`).click();
  }
}

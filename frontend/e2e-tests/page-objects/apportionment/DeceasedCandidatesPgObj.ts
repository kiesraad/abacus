import type { Locator, Page } from "@playwright/test";

export class DeceasedCandidates {
  readonly header: Locator;
  readonly deceasedCandidates: Locator;
  readonly addCandidate: Locator;

  constructor(protected readonly page: Page) {
    this.header = page.getByRole("heading", { level: 1, name: "Overleden kandidaten" });

    this.deceasedCandidates = page.getByTestId("deceased-candidates").locator("tbody").getByRole("row");

    this.addCandidate = page.getByRole("link", { name: "+ Kandidaat toevoegen" });
  }

  findCandidateByNumber(candidateNumber: number) {
    return this.page.getByTestId(`candidate-${candidateNumber}`);
  }

  async clickDeleteCandidate(candidateNumber: number) {
    const row = this.page.getByTestId(`candidate-${candidateNumber}`);
    await row.getByRole("button", { name: "Verwijderen" }).click();
  }
}

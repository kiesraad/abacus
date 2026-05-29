import type { Locator, Page } from "@playwright/test";

export class DeceasedCandidates {
  readonly header: Locator;
  readonly deceasedCandidates: Locator;
  readonly addCandidate: Locator;
  readonly toApportionment: Locator;

  constructor(protected readonly page: Page) {
    this.header = page.getByRole("heading", { level: 1, name: "Overleden kandidaten" });

    this.deceasedCandidates = page.getByTestId("deceased-candidates").locator("tbody").getByRole("row");

    this.addCandidate = page.getByRole("link", { name: "+ Kandidaat toevoegen" });

    this.toApportionment = page.getByRole("button", { name: "Naar zetelverdeling" });
  }

  findCandidate(listNumber: number, candidateNumber: number) {
    return this.page.getByTestId(`list-${listNumber}-candidate-${candidateNumber}`);
  }

  async clickDeleteCandidate(listNumber: number, candidateNumber: number) {
    const row = this.page.getByTestId(`list-${listNumber}-candidate-${candidateNumber}`);
    await row.getByRole("button", { name: "Verwijderen" }).click();
  }
}

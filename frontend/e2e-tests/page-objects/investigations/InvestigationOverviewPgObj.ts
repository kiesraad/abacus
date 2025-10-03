import { type Locator, type Page } from "@playwright/test";

export class InvestigationOverviewPgObj {
  readonly header: Locator;
  readonly addInvestigationButton: Locator;
  readonly fillInvestigationLink: Locator;

  constructor(protected readonly page: Page) {
    this.header = page.getByRole("heading", { level: 1 });
    this.addInvestigationButton = page.getByRole("link", { name: "Onderzoek toevoegen" });
    this.fillInvestigationLink = page.getByRole("link", { name: "Nu invullen" });
  }

  findInvestigationEditLinkByPollingStation(number: string) {
    return this.page.getByTestId(`investigation-${number}`).getByRole("link", { name: /Bewerken|Nu invullen/ });
  }
}

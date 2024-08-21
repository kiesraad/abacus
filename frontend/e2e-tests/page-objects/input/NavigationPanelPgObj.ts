import { type Locator, type Page } from "@playwright/test";

export class NavigationPanel {
  protected readonly page: Page;

  readonly Recounted: Locator;
  readonly RecountedIcon: Locator;
  readonly VotersAndVotes: Locator;
  readonly VotersAndVotesIcon: Locator;

  constructor(page: Page) {
    this.page = page;

    this.Recounted = page.locator("li").filter({ hasText: "Is er herteld?" });
    this.RecountedIcon = this.Recounted.getByRole("img");
    this.VotersAndVotes = page.locator("li").filter({ hasText: "Aantal kiezers en stemmen" });
    this.VotersAndVotesIcon = this.VotersAndVotes.getByRole("img");
  }
}

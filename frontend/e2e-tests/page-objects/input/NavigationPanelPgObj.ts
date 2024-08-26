import { type Locator, type Page } from "@playwright/test";

export class NavigationPanel {
  protected readonly page: Page;

  readonly recounted: Locator;
  readonly recountedIcon: Locator;
  readonly votersAndVotes: Locator;
  readonly votersAndVotesIcon: Locator;
  readonly differences: Locator;
  readonly differencesIcon: Locator;

  constructor(page: Page) {
    this.page = page;

    this.recounted = page.locator("li").filter({ hasText: "Is er herteld?" });
    this.recountedIcon = this.recounted.getByRole("img");
    this.votersAndVotes = page.locator("li").filter({ hasText: "Aantal kiezers en stemmen" });
    this.votersAndVotesIcon = this.votersAndVotes.getByRole("img");
    this.differences = page.locator("li").filter({ hasText: "Verschillen" });
    this.differencesIcon = this.differences.getByRole("img");
  }

  list(listNumber: number) {
    return this.page.locator("li").filter({ hasText: `Lijst ${listNumber} - ` });
  }
}

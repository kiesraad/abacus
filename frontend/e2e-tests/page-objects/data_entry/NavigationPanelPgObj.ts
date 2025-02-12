import { type Locator, type Page } from "@playwright/test";

export class NavigationPanel {
  readonly navElement: Locator;
  readonly recounted: Locator;
  readonly recountedIcon: Locator;
  readonly votersAndVotes: Locator;
  readonly votersAndVotesIcon: Locator;
  readonly differences: Locator;
  readonly differencesIcon: Locator;
  readonly checkAndSave: Locator;
  readonly checkAndSaveIcon: Locator;

  constructor(protected readonly page: Page) {
    this.navElement = page.getByRole("navigation");

    this.recounted = this.navElement.getByRole("listitem").filter({ hasText: "Is er herteld?" });
    this.recountedIcon = this.recounted.getByRole("img");
    this.votersAndVotes = this.navElement.getByRole("listitem").filter({ hasText: "Aantal kiezers en stemmen" });
    this.votersAndVotesIcon = this.votersAndVotes.getByRole("img");
    this.differences = this.navElement.getByRole("listitem").filter({ hasText: "Verschillen" });
    this.differencesIcon = this.differences.getByRole("img");
    this.checkAndSave = this.navElement.getByRole("listitem").filter({ hasText: "Controleren en opslaan" });
    this.checkAndSaveIcon = this.checkAndSave.getByRole("img");
  }

  allListNames() {
    return this.navElement
      .getByRole("listitem")
      .filter({ hasText: /^Lijst / })
      .allTextContents();
  }

  list(listNumber: number) {
    return this.navElement.getByRole("listitem").filter({ hasText: `Lijst ${listNumber} - ` });
  }

  listIcon(listNumber: number) {
    return this.list(listNumber).getByRole("img");
  }
}

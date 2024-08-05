import { type Locator, type Page } from "@playwright/test";

import { InputBasePage } from "./InputBasePage";

export class DifferencesPage extends InputBasePage {
  readonly moreBallotsCount: Locator;
  readonly fewerBallotsCount: Locator;
  readonly unreturnedBallotsCount: Locator;
  readonly tooFewBallotsHandedOutCount: Locator;
  readonly otherExplanationCount: Locator;
  readonly volgende: Locator;

  constructor(page: Page) {
    super(page);

    this.moreBallotsCount = page.getByTestId("more_ballots_count");
    this.fewerBallotsCount = page.getByTestId("fewer_ballots_count");
    this.unreturnedBallotsCount = page.getByTestId("unreturned_ballots_count");
    this.tooFewBallotsHandedOutCount = page.getByTestId("too_few_ballots_handed_out_count");
    this.tooFewBallotsHandedOutCount = page.getByTestId("too_many_ballots_handed_out_count");
    this.otherExplanationCount = page.getByTestId("other_explanation_count");
    this.otherExplanationCount = page.getByTestId("no_explanation_count");

    this.volgende = page.getByRole("button", { name: "Volgende" });
  }
}

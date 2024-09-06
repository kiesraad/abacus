import { type Locator, type Page } from "@playwright/test";

import { InputBasePage } from "./InputBasePgObj";

interface MoreBallotFields {
  moreBallotsCount: number;
  tooManyBallotsHandedOutCount: number;
  otherExplanationCount: number;
  noExplanationCount: number;
}

interface FewerBallotsFields {
  fewerBallotsCount: number;
  unreturnedBallotsCount: number;
  tooFewBallotsHandedOutCount: number;
  otherExplanationCount: number;
  noExplanationCount: number;
}

export class DifferencesPage extends InputBasePage {
  readonly heading: Locator;
  readonly next: Locator;

  readonly moreBallotsCount: Locator;
  readonly fewerBallotsCount: Locator;
  readonly unreturnedBallotsCount: Locator;
  readonly tooFewBallotsHandedOutCount: Locator;
  readonly tooManyBallotsHandedOutCount: Locator;
  readonly otherExplanationCount: Locator;
  readonly noExplanationCount: Locator;

  constructor(page: Page) {
    super(page);

    this.heading = page.getByRole("heading", {
      level: 2,
      name: "Verschillen tussen toegelaten kiezers en uitgebrachte stemmen",
    });

    this.moreBallotsCount = page.getByTestId("more_ballots_count");
    this.fewerBallotsCount = page.getByTestId("fewer_ballots_count");
    this.unreturnedBallotsCount = page.getByTestId("unreturned_ballots_count");
    this.tooFewBallotsHandedOutCount = page.getByTestId("too_few_ballots_handed_out_count");
    this.tooManyBallotsHandedOutCount = page.getByTestId("too_many_ballots_handed_out_count");
    this.otherExplanationCount = page.getByTestId("other_explanation_count");
    this.noExplanationCount = page.getByTestId("no_explanation_count");

    this.next = page.getByRole("button", { name: "Volgende" });
  }

  async fillMoreBallotsFields(fields: MoreBallotFields) {
    await this.moreBallotsCount.fill(fields.moreBallotsCount.toString());
    await this.tooManyBallotsHandedOutCount.fill(fields.tooManyBallotsHandedOutCount.toString());
    await this.otherExplanationCount.fill(fields.otherExplanationCount.toString());
    await this.noExplanationCount.fill(fields.noExplanationCount.toString());
  }

  async fillFewerBallotsFields(fields: FewerBallotsFields) {
    await this.fewerBallotsCount.fill(fields.fewerBallotsCount.toString());
    await this.unreturnedBallotsCount.fill(fields.unreturnedBallotsCount.toString());
    await this.tooFewBallotsHandedOutCount.fill(fields.tooFewBallotsHandedOutCount.toString());
    await this.otherExplanationCount.fill(fields.otherExplanationCount.toString());
    await this.noExplanationCount.fill(fields.noExplanationCount.toString());
  }
}

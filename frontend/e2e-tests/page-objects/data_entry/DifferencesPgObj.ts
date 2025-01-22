import { type Locator, type Page } from "@playwright/test";

import { DifferencesCounts } from "@kiesraad/api";

import { DataEntryBasePage } from "./DataEntryBasePgObj";

export type MoreBallotsFields = Pick<
  DifferencesCounts,
  "more_ballots_count" | "too_many_ballots_handed_out_count" | "other_explanation_count" | "no_explanation_count"
>;

export type FewerBallotsFields = Pick<
  DifferencesCounts,
  | "fewer_ballots_count"
  | "unreturned_ballots_count"
  | "too_few_ballots_handed_out_count"
  | "other_explanation_count"
  | "no_explanation_count"
>;

export class DifferencesPage extends DataEntryBasePage {
  readonly fieldset: Locator;
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

    this.fieldset = page.getByRole("group", {
      name: "Verschillen tussen toegelaten kiezers en uitgebrachte stemmen",
    });

    this.moreBallotsCount = page.getByRole("textbox", { name: "I Stembiljetten méér geteld" });
    this.fewerBallotsCount = page.getByRole("textbox", { name: "J Stembiljetten minder geteld" });
    this.unreturnedBallotsCount = page.getByRole("textbox", { name: "K Niet ingeleverde stembiljetten" });
    this.tooFewBallotsHandedOutCount = page.getByRole("textbox", { name: "L Te weinig uitgereikte stembiljetten" });
    this.tooManyBallotsHandedOutCount = page.getByRole("textbox", { name: "M Te veel uitgereikte stembiljetten" });
    this.otherExplanationCount = page.getByRole("textbox", { name: "N Andere verklaring voor het verschil" });
    this.noExplanationCount = page.getByRole("textbox", { name: "O Geen verklaring voor het verschil" });

    this.next = page.getByRole("button", { name: "Volgende" });
  }

  async fillInPageAndClickNext(fields: DifferencesCounts) {
    await this.moreBallotsCount.fill(fields.more_ballots_count.toString());
    await this.fewerBallotsCount.fill(fields.fewer_ballots_count.toString());
    await this.unreturnedBallotsCount.fill(fields.unreturned_ballots_count.toString());
    await this.tooFewBallotsHandedOutCount.fill(fields.too_few_ballots_handed_out_count.toString());
    await this.tooManyBallotsHandedOutCount.fill(fields.too_many_ballots_handed_out_count.toString());
    await this.otherExplanationCount.fill(fields.other_explanation_count.toString());
    await this.noExplanationCount.fill(fields.no_explanation_count.toString());
    await this.next.click();
  }

  async fillMoreBallotsFields(fields: MoreBallotsFields) {
    await this.moreBallotsCount.fill(fields.more_ballots_count.toString());
    await this.tooManyBallotsHandedOutCount.fill(fields.too_many_ballots_handed_out_count.toString());
    await this.otherExplanationCount.fill(fields.other_explanation_count.toString());
    await this.noExplanationCount.fill(fields.no_explanation_count.toString());
  }

  async fillFewerBallotsFields(fields: FewerBallotsFields) {
    await this.fewerBallotsCount.fill(fields.fewer_ballots_count.toString());
    await this.unreturnedBallotsCount.fill(fields.unreturned_ballots_count.toString());
    await this.tooFewBallotsHandedOutCount.fill(fields.too_few_ballots_handed_out_count.toString());
    await this.otherExplanationCount.fill(fields.other_explanation_count.toString());
    await this.noExplanationCount.fill(fields.no_explanation_count.toString());
  }
}

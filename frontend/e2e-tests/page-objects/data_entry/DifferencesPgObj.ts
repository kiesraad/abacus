import { type Locator, type Page } from "@playwright/test";

import { DataEntryBasePage } from "./DataEntryBasePgObj";

export interface MoreBallotsFields {
  moreBallotsCount: number;
  tooManyBallotsHandedOutCount: number;
  otherExplanationCount: number;
  noExplanationCount: number;
}

export interface FewerBallotsFields {
  fewerBallotsCount: number;
  unreturnedBallotsCount: number;
  tooFewBallotsHandedOutCount: number;
  otherExplanationCount: number;
  noExplanationCount: number;
}

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

  async fillMoreBallotsFields(fields: MoreBallotsFields) {
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

import type { Locator, Page } from "@playwright/test";

import type { GSBDifferencesCounts } from "@/types/generated/openapi";

import { DataEntryBasePage } from "./DataEntryBasePgObj";

export type MoreBallotsFields = Pick<GSBDifferencesCounts, "more_ballots_count">;

export type FewerBallotsFields = Pick<GSBDifferencesCounts, "fewer_ballots_count">;

export class GSBDifferencesPage extends DataEntryBasePage {
  readonly fieldset: Locator;
  readonly next: Locator;

  readonly moreBallotsCount: Locator;
  readonly fewerBallotsCount: Locator;

  readonly acceptErrorsAndWarnings: Locator;
  readonly acceptErrorsAndWarningsReminder: Locator;

  constructor(page: Page) {
    super(page);

    this.fieldset = page.getByRole("group", {
      name: "Verschillen tussen aantal kiezers en uitgebrachte stemmen",
    });

    this.moreBallotsCount = page.getByRole("textbox", { name: "I Totaal aantal méér getelde stemmen" });
    this.fewerBallotsCount = page.getByRole("textbox", { name: "J Totaal aantal minder getelde stemmen" });

    this.acceptErrorsAndWarnings = page.getByRole("checkbox", {
      name: "Ik heb mijn invoer gecontroleerd met het papier en correct overgenomen.",
    });
    this.acceptErrorsAndWarningsReminder = page
      .getByRole("alert")
      .filter({ hasText: "Je kan alleen verder als je het papieren proces-verbaal hebt gecontroleerd." });

    this.next = page.getByRole("button", { name: "Volgende" });
  }

  async fillInPageAndClickNext(fields: GSBDifferencesCounts) {
    await this.moreBallotsCount.fill(fields.more_ballots_count.toString());
    await this.fewerBallotsCount.fill(fields.fewer_ballots_count.toString());

    await this.next.click();
  }

  async fillMoreBallotsFields(fields: MoreBallotsFields) {
    await this.moreBallotsCount.fill(fields.more_ballots_count.toString());
  }

  async fillFewerBallotsFields(fields: FewerBallotsFields) {
    await this.fewerBallotsCount.fill(fields.fewer_ballots_count.toString());
  }

  async checkAcceptErrorsAndWarnings() {
    await this.acceptErrorsAndWarnings.waitFor();
    await this.acceptErrorsAndWarnings.check();
  }
}

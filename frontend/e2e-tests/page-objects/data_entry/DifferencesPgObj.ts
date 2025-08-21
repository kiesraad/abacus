import { type Locator, type Page } from "@playwright/test";

import { DifferencesCounts } from "@/types/generated/openapi";

import { DataEntryBasePage } from "./DataEntryBasePgObj";

export type MoreBallotsFields = Pick<DifferencesCounts, "more_ballots_count">;

export type FewerBallotsFields = Pick<DifferencesCounts, "fewer_ballots_count">;

export class DifferencesPage extends DataEntryBasePage {
  readonly fieldset: Locator;
  readonly next: Locator;

  readonly admittedVotersEqualsVotesCastCheckbox: Locator;
  readonly votesCastGreaterThanAdmittedVotersCheckbox: Locator;
  readonly votesCastSmallerThanAdmittedVotersCheckbox: Locator;
  readonly differenceCompletelyAccountedFor: Locator;
  readonly differenceCompletelyAccountedForYes: Locator;
  readonly differenceCompletelyAccountedForNo: Locator;
  readonly moreBallotsCount: Locator;
  readonly fewerBallotsCount: Locator;

  readonly acceptErrorsAndWarnings: Locator;
  readonly acceptErrorsAndWarningsReminder: Locator;

  constructor(page: Page) {
    super(page);

    this.fieldset = page.getByRole("group", {
      name: "Verschillen tussen aantal kiezers en uitgebrachte stemmen B1-3.3",
    });

    this.admittedVotersEqualsVotesCastCheckbox = page.getByRole("checkbox", { name: "D en H zijn gelijk" });
    this.votesCastGreaterThanAdmittedVotersCheckbox = page.getByRole("checkbox", {
      name: "H is groter dan D (meer uitgebrachte stemmen dan toegelaten kiezers)",
    });
    this.votesCastSmallerThanAdmittedVotersCheckbox = page.getByRole("checkbox", {
      name: "H is kleiner dan D (minder uitgebrachte stemmen dan toegelaten kiezers)",
    });

    this.moreBallotsCount = page.getByRole("textbox", { name: "I Aantal méér getelde stemmen" });
    this.fewerBallotsCount = page.getByRole("textbox", { name: "J Aantal minder getelde stemmen" });

    this.differenceCompletelyAccountedFor = this.fieldset.getByRole("group").filter({
      hasText:
        "3.3.2 Zijn er tijdens de stemming dingen opgeschreven die het verschil tussen D en H volledig verklaren?",
    });
    this.differenceCompletelyAccountedForYes = this.differenceCompletelyAccountedFor.getByLabel("Ja");
    this.differenceCompletelyAccountedForNo = this.differenceCompletelyAccountedFor.getByLabel("Nee");

    this.acceptErrorsAndWarnings = page.getByLabel(
      "Ik heb mijn invoer gecontroleerd met het papier en correct overgenomen.",
    );
    this.acceptErrorsAndWarningsReminder = page
      .getByRole("alert")
      .filter({ hasText: "Je kan alleen verder als je het papieren proces-verbaal hebt gecontroleerd." });

    this.next = page.getByRole("button", { name: "Volgende" });
  }

  async fillInPageAndClickNext(fields: DifferencesCounts) {
    await this.moreBallotsCount.fill(fields.more_ballots_count.toString());
    await this.fewerBallotsCount.fill(fields.fewer_ballots_count.toString());

    if (fields.admitted_voters_equals_votes_cast) {
      await this.admittedVotersEqualsVotesCastCheckbox.check();
    } else {
      await this.admittedVotersEqualsVotesCastCheckbox.uncheck();
    }

    if (fields.votes_cast_greater_than_admitted_voters) {
      await this.votesCastGreaterThanAdmittedVotersCheckbox.check();
    } else {
      await this.votesCastGreaterThanAdmittedVotersCheckbox.uncheck();
    }

    if (fields.votes_cast_smaller_than_admitted_voters) {
      await this.votesCastSmallerThanAdmittedVotersCheckbox.check();
    } else {
      await this.votesCastSmallerThanAdmittedVotersCheckbox.uncheck();
    }

    if (fields.difference_completely_accounted_for.yes) {
      await this.differenceCompletelyAccountedForYes.check();
    } else {
      await this.differenceCompletelyAccountedForYes.uncheck();
    }

    if (fields.difference_completely_accounted_for.no) {
      await this.differenceCompletelyAccountedForNo.check();
    } else {
      await this.differenceCompletelyAccountedForNo.uncheck();
    }

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

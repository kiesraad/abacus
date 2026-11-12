import type { Locator, Page } from "@playwright/test";

import type { ChecksAndCorrections } from "@/types/generated/openapi";

import { DataEntryBasePage } from "./DataEntryBasePgObj";

export const bothReasonsAndCorrectedResultsOwnInitiative: ChecksAndCorrections = {
  reason_investigation_own_initiative: { unaccounted_difference: true, other_error: true },
  corrected_results_own_initiative: { yes: true, no: false },
  corrected_results_csb_request: { yes: false, no: false },
};

export class ChecksAndCorrectionsPage extends DataEntryBasePage {
  readonly fieldset: Locator;
  readonly reasonInvestigationOwnInitiative: Locator;
  readonly unaccountedDifference: Locator;
  readonly otherError: Locator;
  readonly correctedResultsOwnInitiative: Locator;
  readonly correctedResultsOwnInitiativeYes: Locator;
  readonly correctedResultsOwnInitiativeNo: Locator;
  readonly correctedResultsCsbRequest: Locator;
  readonly correctedResultsCsbRequestYes: Locator;
  readonly correctedResultsCsbRequestNo: Locator;
  readonly next: Locator;

  constructor(page: Page) {
    super(page);

    this.fieldset = page.getByRole("group", {
      name: "Controles en correcties",
    });

    this.reasonInvestigationOwnInitiative = this.fieldset.getByRole("group").filter({
      hasText: "Waarom heeft het gemeentelijk stembureau de telresultaten onderzocht?",
    });
    this.unaccountedDifference = this.reasonInvestigationOwnInitiative.getByRole("checkbox", {
      name: "Vanwege een onverklaard verschil",
    });
    this.otherError = this.reasonInvestigationOwnInitiative.getByRole("checkbox", {
      name: "Vanwege (het vermoeden van) een andere fout",
    });

    this.correctedResultsOwnInitiative = this.fieldset
      .getByRole("group")
      .filter({
        hasText: "Zijn er gecorrigeerde telresultaten?",
      })
      .first();
    this.correctedResultsOwnInitiativeYes = this.correctedResultsOwnInitiative.getByRole("checkbox", { name: "Ja" });
    this.correctedResultsOwnInitiativeNo = this.correctedResultsOwnInitiative.getByRole("checkbox", { name: "Nee" });

    this.correctedResultsCsbRequest = this.fieldset
      .getByRole("group")
      .filter({
        hasText: "Zijn er gecorrigeerde telresultaten?",
      })
      .last();
    this.correctedResultsCsbRequestYes = this.correctedResultsCsbRequest.getByRole("checkbox", { name: "Ja" });
    this.correctedResultsCsbRequestNo = this.correctedResultsCsbRequest.getByRole("checkbox", { name: "Nee" });

    this.next = page.getByRole("button", { name: "Volgende" });
  }

  async fillAndClickNext(checksAndCorrections: ChecksAndCorrections) {
    if (checksAndCorrections.reason_investigation_own_initiative.unaccounted_difference) {
      await this.unaccountedDifference.check();
    } else {
      await this.unaccountedDifference.uncheck();
    }

    if (checksAndCorrections.reason_investigation_own_initiative.other_error) {
      await this.otherError.check();
    } else {
      await this.otherError.uncheck();
    }

    if (checksAndCorrections.corrected_results_own_initiative.yes) {
      await this.correctedResultsOwnInitiativeYes.check();
    } else {
      await this.correctedResultsOwnInitiativeYes.uncheck();
    }

    if (checksAndCorrections.corrected_results_own_initiative.no) {
      await this.correctedResultsOwnInitiativeNo.check();
    } else {
      await this.correctedResultsOwnInitiativeNo.uncheck();
    }

    if (checksAndCorrections.corrected_results_csb_request.yes) {
      await this.correctedResultsCsbRequestYes.check();
    } else {
      await this.correctedResultsCsbRequestYes.uncheck();
    }

    if (checksAndCorrections.corrected_results_csb_request.no) {
      await this.correctedResultsCsbRequestNo.check();
    } else {
      await this.correctedResultsCsbRequestNo.uncheck();
    }

    await this.next.click();
  }
}

import { type Locator, type Page } from "@playwright/test";

import { CountingDifferencesPollingStation } from "@/types/generated/openapi";

import { DataEntryBasePage } from "./DataEntryBasePgObj";

export const noDifferences = {
  difference_ballots_per_list: { yes: false, no: true },
  unexplained_difference_ballots_voters: { yes: false, no: true },
};

export class CountingDifferencesPollingStationPage extends DataEntryBasePage {
  readonly fieldset: Locator;
  readonly differenceBallotsPerList: Locator;
  readonly differenceBallotsPerListYes: Locator;
  readonly differenceBallotsPerListNo: Locator;
  readonly unexplainedDifferenceBallotsVoters: Locator;
  readonly unexplainedDifferenceBallotsVotersYes: Locator;
  readonly unexplainedDifferenceBallotsVotersNo: Locator;
  readonly next: Locator;

  constructor(page: Page) {
    super(page);

    this.fieldset = page.getByRole("group", {
      name: /^Verschillen met telresultaten van het stembureau B1-2/,
    });

    this.differenceBallotsPerList = this.fieldset.getByRole("group", {
      name: "2.1  Aantallen kiezers en stemmen",
    });
    this.differenceBallotsPerListYes = this.differenceBallotsPerList.getByLabel("Ja");
    this.differenceBallotsPerListNo = this.differenceBallotsPerList.getByLabel("Nee");

    this.unexplainedDifferenceBallotsVoters = this.fieldset.getByRole("group", {
      name: "2.3 Tellingen op lijstniveau",
    });
    this.unexplainedDifferenceBallotsVotersYes = this.unexplainedDifferenceBallotsVoters.getByLabel("Ja");
    this.unexplainedDifferenceBallotsVotersNo = this.unexplainedDifferenceBallotsVoters.getByLabel("Nee");

    this.next = page.getByRole("button", { name: "Volgende" });
  }

  async fillAndClickNext(countingDifferencesPollingStation: CountingDifferencesPollingStation) {
    if (countingDifferencesPollingStation.difference_ballots_per_list.yes) {
      await this.differenceBallotsPerListYes.check();
    } else {
      await this.differenceBallotsPerListYes.uncheck();
    }

    if (countingDifferencesPollingStation.difference_ballots_per_list.no) {
      await this.differenceBallotsPerListNo.check();
    } else {
      await this.differenceBallotsPerListNo.uncheck();
    }

    if (countingDifferencesPollingStation.unexplained_difference_ballots_voters.yes) {
      await this.unexplainedDifferenceBallotsVotersYes.check();
    } else {
      await this.unexplainedDifferenceBallotsVotersYes.uncheck();
    }

    if (countingDifferencesPollingStation.unexplained_difference_ballots_voters.no) {
      await this.unexplainedDifferenceBallotsVotersNo.check();
    } else {
      await this.unexplainedDifferenceBallotsVotersNo.uncheck();
    }

    await this.next.click();
  }

  async getCountingDifferencesPollingStation(): Promise<CountingDifferencesPollingStation> {
    const differenceBallotsPerListYes = await this.differenceBallotsPerListYes.isChecked();
    const differenceBallotsPerListNo = await this.differenceBallotsPerListNo.isChecked();
    const unexplainedDifferenceBallotsVotersExtraInvestigationYes =
      await this.unexplainedDifferenceBallotsVotersYes.isChecked();
    const unexplainedDifferenceBallotsVotersExtraInvestigationNo =
      await this.unexplainedDifferenceBallotsVotersNo.isChecked();

    return {
      difference_ballots_per_list: {
        yes: differenceBallotsPerListYes,
        no: differenceBallotsPerListNo,
      },
      unexplained_difference_ballots_voters: {
        yes: unexplainedDifferenceBallotsVotersExtraInvestigationYes,
        no: unexplainedDifferenceBallotsVotersExtraInvestigationNo,
      },
    };
  }
}

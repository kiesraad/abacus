import type { Locator, Page } from "@playwright/test";

import type { CountingDifferencesPollingStation } from "@/types/generated/openapi";

import { DataEntryBasePage } from "./DataEntryBasePgObj";

export const noDifferences = {
  difference_ballots_per_list: { yes: false, no: true },
  difference_ballots_voters_completely_accounted_for: { yes: false, no: true },
};

export class CountingDifferencesPollingStationPage extends DataEntryBasePage {
  readonly fieldset: Locator;
  readonly differenceBallotsPerList: Locator;
  readonly differenceBallotsPerListYes: Locator;
  readonly differenceBallotsPerListNo: Locator;
  readonly differenceBallotsVotersCompletelyAccountedFor: Locator;
  readonly differenceBallotsVotersCompletelyAccountedForYes: Locator;
  readonly differenceBallotsVotersCompletelyAccountedForNo: Locator;
  readonly next: Locator;

  constructor(page: Page) {
    super(page);

    this.fieldset = page.getByRole("group", {
      name: /^Verschillen met telresultaten van het stembureau B1-2/,
    });

    this.differenceBallotsPerList = this.fieldset.getByRole("group").filter({
      hasText:
        "Was er in de telresultaten van het stembureau een onverklaard verschil tussen het totaal aantal getelde stembiljetten en het aantal toegelaten kiezers?",
    });
    this.differenceBallotsPerListYes = this.differenceBallotsPerList.getByRole("checkbox", { name: "Ja" });
    this.differenceBallotsPerListNo = this.differenceBallotsPerList.getByRole("checkbox", { name: "Nee" });

    this.differenceBallotsVotersCompletelyAccountedFor = this.fieldset.getByRole("group").filter({
      hasText:
        "Is er een verschil tussen het totaal aantal getelde stembiljetten per lijst zoals eerder vastgesteld door het stembureau en zoals door u geteld op het gemeentelijk stembureau?",
    });
    this.differenceBallotsVotersCompletelyAccountedForYes =
      this.differenceBallotsVotersCompletelyAccountedFor.getByRole("checkbox", {
        name: "Ja",
      });
    this.differenceBallotsVotersCompletelyAccountedForNo = this.differenceBallotsVotersCompletelyAccountedFor.getByRole(
      "checkbox",
      {
        name: "Nee",
      },
    );

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

    if (countingDifferencesPollingStation.difference_ballots_voters_completely_accounted_for.yes) {
      await this.differenceBallotsVotersCompletelyAccountedForYes.check();
    } else {
      await this.differenceBallotsVotersCompletelyAccountedForYes.uncheck();
    }

    if (countingDifferencesPollingStation.difference_ballots_voters_completely_accounted_for.no) {
      await this.differenceBallotsVotersCompletelyAccountedForNo.check();
    } else {
      await this.differenceBallotsVotersCompletelyAccountedForNo.uncheck();
    }

    await this.next.click();
  }

  async getCountingDifferencesPollingStation(): Promise<CountingDifferencesPollingStation> {
    const differenceBallotsPerListYes = await this.differenceBallotsPerListYes.isChecked();
    const differenceBallotsPerListNo = await this.differenceBallotsPerListNo.isChecked();
    const differenceBallotsVotersCompletelyAccountedForExtraInvestigationYes =
      await this.differenceBallotsVotersCompletelyAccountedForYes.isChecked();
    const differenceBallotsVotersCompletelyAccountedForExtraInvestigationNo =
      await this.differenceBallotsVotersCompletelyAccountedForNo.isChecked();

    return {
      difference_ballots_per_list: {
        yes: differenceBallotsPerListYes,
        no: differenceBallotsPerListNo,
      },
      difference_ballots_voters_completely_accounted_for: {
        yes: differenceBallotsVotersCompletelyAccountedForExtraInvestigationYes,
        no: differenceBallotsVotersCompletelyAccountedForExtraInvestigationNo,
      },
    };
  }
}

import type { Locator, Page } from "@playwright/test";

import type { CountingDifferencesPollingStation } from "@/types/generated/openapi";

import { DataEntryBasePage } from "./DataEntryBasePgObj";

export const noDifferences = {
  difference_ballots_per_list: { yes: false, no: true },
  difference_ballots_voters_completely_accounted_for: { yes: true, no: false },
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

    // B1-2.3 Tellingen op lijstniveau
    this.differenceBallotsPerList = this.fieldset.getByRole("group").filter({
      hasText:
        "Is er een verschil tussen het totaal aantal getelde stembiljetten per lijst zoals eerder vastgesteld door het stembureau en zoals door u geteld op het gemeentelijk stembureau?",
    });
    this.differenceBallotsPerListYes = this.differenceBallotsPerList.getByRole("checkbox", { name: "Ja" });
    this.differenceBallotsPerListNo = this.differenceBallotsPerList.getByRole("checkbox", { name: "Nee" });

    // B1-2.1 Aantallen kiezers en stemmen
    this.differenceBallotsVotersCompletelyAccountedFor = this.fieldset.getByRole("group").filter({
      hasText:
        "Is in de telresultaten van het stembureau het verschil tussen het totaal aantal getelde stemmen en het aantal toegelaten kiezers volledig verklaard?",
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

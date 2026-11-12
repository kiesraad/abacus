import type { Locator, Page } from "@playwright/test";

import type { ExtraInvestigation } from "@/types/generated/openapi";

import { DataEntryBasePage } from "./DataEntryBasePgObj";

export const noExtraInvestigation: ExtraInvestigation = {
  extra_investigation_done: { yes: false, no: true },
  ballots_recounted_extra_investigation: { yes: false, no: false },
};

export class ExtraInvestigationPage extends DataEntryBasePage {
  readonly fieldset: Locator;
  readonly extraInvestigationDone: Locator;
  readonly extraInvestigationDoneYes: Locator;
  readonly extraInvestigationDoneNo: Locator;
  readonly ballotsRecounted: Locator;
  readonly ballotsRecountedYes: Locator;
  readonly ballotsRecountedNo: Locator;
  readonly next: Locator;

  constructor(page: Page) {
    super(page);

    this.fieldset = page.getByRole("group", {
      name: /^Extra onderzoek B1-1/,
    });

    this.extraInvestigationDone = this.fieldset.getByRole("group").filter({
      hasText: "Heeft het gemeentelijk stembureau extra onderzoek gedaan?",
    });
    this.extraInvestigationDoneYes = this.extraInvestigationDone.getByRole("checkbox", { name: "Ja" });
    this.extraInvestigationDoneNo = this.extraInvestigationDone.getByRole("checkbox", { name: "Nee" });

    this.ballotsRecounted = this.fieldset.getByRole("group").filter({
      hasText: "Zijn de stembiljetten naar aanleiding van het extra onderzoek (gedeeltelijk) herteld?",
    });
    this.ballotsRecountedYes = this.ballotsRecounted.getByRole("checkbox", { name: "Ja" });
    this.ballotsRecountedNo = this.ballotsRecounted.getByRole("checkbox", { name: "Nee" });

    this.next = page.getByRole("button", { name: "Volgende" });
  }

  async fillAndClickNext(extraInvestigation: ExtraInvestigation) {
    if (extraInvestigation.extra_investigation_done.yes) {
      await this.extraInvestigationDoneYes.check();
    } else {
      await this.extraInvestigationDoneYes.uncheck();
    }

    if (extraInvestigation.extra_investigation_done.no) {
      await this.extraInvestigationDoneNo.check();
    } else {
      await this.extraInvestigationDoneNo.uncheck();
    }

    if (extraInvestigation.ballots_recounted_extra_investigation.yes) {
      await this.ballotsRecountedYes.check();
    } else {
      await this.ballotsRecountedYes.uncheck();
    }

    if (extraInvestigation.ballots_recounted_extra_investigation.no) {
      await this.ballotsRecountedNo.check();
    } else {
      await this.ballotsRecountedNo.uncheck();
    }

    await this.next.click();
  }
}

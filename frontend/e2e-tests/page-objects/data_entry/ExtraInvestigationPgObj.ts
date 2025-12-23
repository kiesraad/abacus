import { type Locator, type Page } from "@playwright/test";

import { ExtraInvestigation } from "@/types/generated/openapi";

import { DataEntryBasePage } from "./DataEntryBasePgObj";

export const noExtraInvestigation: ExtraInvestigation = {
  extra_investigation_other_reason: { yes: false, no: true },
  ballots_recounted_extra_investigation: { yes: false, no: true },
};

export class ExtraInvestigationPage extends DataEntryBasePage {
  readonly fieldset: Locator;
  readonly extraInvestigationOtherReason: Locator;
  readonly extraInvestigationOtherReasonYes: Locator;
  readonly extraInvestigationOtherReasonNo: Locator;
  readonly ballotsRecounted: Locator;
  readonly ballotsRecountedYes: Locator;
  readonly ballotsRecountedNo: Locator;
  readonly next: Locator;

  constructor(page: Page) {
    super(page);

    this.fieldset = page.getByRole("group", {
      name: /^Alleen bij extra onderzoek B1-1/,
    });

    this.extraInvestigationOtherReason = this.fieldset.getByRole("group").filter({
      hasText:
        "Heeft het gemeentelijk stembureau extra onderzoek gedaan vanwege een andere reden dan een onverklaard verschil?",
    });
    this.extraInvestigationOtherReasonYes = this.extraInvestigationOtherReason.getByRole("checkbox", { name: "Ja" });
    this.extraInvestigationOtherReasonNo = this.extraInvestigationOtherReason.getByRole("checkbox", { name: "Nee" });

    this.ballotsRecounted = this.fieldset.getByRole("group").filter({
      hasText: "Zijn de stembiljetten naar aanleiding van het extra onderzoek (gedeeltelijk) herteld?",
    });
    this.ballotsRecountedYes = this.ballotsRecounted.getByRole("checkbox", { name: "Ja" });
    this.ballotsRecountedNo = this.ballotsRecounted.getByRole("checkbox", { name: "Nee" });

    this.next = page.getByRole("button", { name: "Volgende" });
  }

  async fillAndClickNext(extraInvestigation: ExtraInvestigation) {
    if (extraInvestigation.extra_investigation_other_reason.yes) {
      await this.extraInvestigationOtherReasonYes.check();
    } else {
      await this.extraInvestigationOtherReasonYes.uncheck();
    }

    if (extraInvestigation.extra_investigation_other_reason.no) {
      await this.extraInvestigationOtherReasonNo.check();
    } else {
      await this.extraInvestigationOtherReasonNo.uncheck();
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

  async getExtraInvestigation(): Promise<ExtraInvestigation> {
    const extraInvestigationOtherReasonYes = await this.extraInvestigationOtherReasonYes.isChecked();
    const extraInvestigationOtherReasonNo = await this.extraInvestigationOtherReasonNo.isChecked();
    const ballotsRecountedExtraInvestigationYes = await this.ballotsRecountedYes.isChecked();
    const ballotsRecountedExtraInvestigationNo = await this.ballotsRecountedNo.isChecked();

    return {
      extra_investigation_other_reason: {
        yes: extraInvestigationOtherReasonYes,
        no: extraInvestigationOtherReasonNo,
      },
      ballots_recounted_extra_investigation: {
        yes: ballotsRecountedExtraInvestigationYes,
        no: ballotsRecountedExtraInvestigationNo,
      },
    };
  }
}

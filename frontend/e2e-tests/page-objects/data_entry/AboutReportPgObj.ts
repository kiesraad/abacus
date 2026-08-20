import type { Locator, Page } from "@playwright/test";

import type { AboutReport } from "@/types/generated/openapi";

import { DataEntryBasePage } from "./DataEntryBasePgObj";

export const twoDocumentsPagePresent: AboutReport = {
  corrigendum_present: "TwoDocuments",
  checks_and_corrections_present: "PagePresent",
};

export class AboutReportPage extends DataEntryBasePage {
  readonly fieldset: Locator;
  readonly corrigendumPresent: Locator;
  readonly twoDocuments: Locator;
  readonly oneDocument: Locator;
  readonly checksAndCorrectionsPresent: Locator;
  readonly pagePresent: Locator;
  readonly pageMissing: Locator;
  readonly next: Locator;

  constructor(page: Page) {
    super(page);

    this.fieldset = page.getByRole("group", {
      name: "Over het proces-verbaal",
    });

    this.corrigendumPresent = this.fieldset.getByRole("group").filter({
      hasText: /^Is er een corrigendum bij het papieren proces-verbaal aanwezig\?/,
    });
    this.twoDocuments = this.corrigendumPresent.getByRole("radio", {
      name: /^Ja, ik heb twee documenten \(een proces-verbaal en een corrigendum\)/,
    });
    this.oneDocument = this.corrigendumPresent.getByRole("radio", {
      name: /^Nee, ik heb één document \(alleen een proces-verbaal\)/,
    });

    this.checksAndCorrectionsPresent = this.fieldset.getByRole("group").filter({
      hasText: /^Is voorin het proces-verbaal de extra pagina controles en correcties ingevoegd\?/,
    });
    this.pagePresent = this.checksAndCorrectionsPresent.getByRole("radio", {
      name: "Ja, de pagina ‘controles en correcties’ is aanwezig",
    });
    this.pageMissing = this.checksAndCorrectionsPresent.getByRole("radio", { name: "Nee, de pagina ontbreekt" });

    this.next = page.getByRole("button", { name: "Volgende" });
  }

  async fillAndClickNext(aboutReport: AboutReport) {
    if (aboutReport.corrigendum_present === "TwoDocuments") {
      await this.twoDocuments.check();
    } else if (aboutReport.corrigendum_present === "OneDocument") {
      await this.oneDocument.check();
    }

    if (aboutReport.checks_and_corrections_present === "PagePresent") {
      await this.pagePresent.check();
    } else if (aboutReport.checks_and_corrections_present === "PageMissing") {
      await this.pageMissing.check();
    }

    await this.next.click();
  }
}

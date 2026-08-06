import { expect, type Page } from "@playwright/test";
import { AbortInputModal } from "e2e-tests/page-objects/data_entry/AbortInputModalPgObj";
import { CheckAndSavePage } from "e2e-tests/page-objects/data_entry/CheckAndSavePgObj";
import { DataEntryBasePage } from "e2e-tests/page-objects/data_entry/DataEntryBasePgObj";
import { DataEntryHomePage } from "e2e-tests/page-objects/data_entry/DataEntryHomePgObj";
import { DifferencesPage } from "e2e-tests/page-objects/data_entry/DifferencesPgObj";
import { VotersAndVotesPage } from "e2e-tests/page-objects/data_entry/VotersAndVotesPgObj";
import { ElectionStatus } from "e2e-tests/page-objects/election/ElectionStatusPgObj";
import { dataEntryRequest, dataEntryWithDifferencesRequest } from "e2e-tests/test-data/request-response-templates";
import type { Results } from "@/types/generated/openapi";
import { type DataEntry, test } from "../../fixtures";

test.describe("data entry - correct differences", () => {
  test("show warnings and empty fields for first entry correction", async ({
    typistOneGSB,
    dataEntryGSBFirstEntryCorrection: dataEntry,
  }) => {
    // Start data entry correction
    const typist = typistOneGSB.page;
    await typist.goto(`/elections/${dataEntry.election_id}/data-entry/${dataEntry.id}/1`);

    // Assert progress icons
    const dataEntryPage = new DataEntryBasePage(typist);
    await expect(dataEntryPage.progressList.extraInvestigationIcon).toHaveAccessibleName("je bent hier");
    await expect(dataEntryPage.progressList.countingDifferencesPollingStationIcon).toHaveAccessibleName("opgeslagen");
    await expect(dataEntryPage.progressList.votersAndVotesIcon).toHaveAccessibleName("bevat een waarschuwing");
    await expect(dataEntryPage.progressList.differencesIcon).toHaveAccessibleName("opgeslagen");
    await expect(dataEntryPage.progressList.listIcon(1)).toHaveAccessibleName("opgeslagen");
    await expect(dataEntryPage.progressList.listIcon(2)).toHaveAccessibleName("opgeslagen");
    await expect(dataEntryPage.progressList.listIcon(3)).toHaveAccessibleName("leeg");
    await expect(dataEntryPage.progressList.checkAndSaveIcon).toHaveAccessibleName("nog niet afgerond");

    // Go to section with warning
    await dataEntryPage.progressList.votersAndVotes.click();
    const votersAndVotesPage = new VotersAndVotesPage(typist);
    await expect(votersAndVotesPage.fieldset).toBeVisible();

    // Assert warning message only
    await expect(votersAndVotesPage.error).toBeHidden();
    await expect(votersAndVotesPage.warning).toContainText(
      [
        "Verschil met andere invoer. Nieuwe invoer nodig",
        "W.002",
        "Een coördinator heeft beide invoeren vergeleken, en aangegeven dat in deze invoer fouten zijn gemaakt.",
      ].join(""),
    );

    // Assert field icons
    await expect(votersAndVotesPage.pollCardCount).toHaveAttribute("aria-errormessage", "feedback-warning");
    await expect(votersAndVotesPage.proxyCertificateCount).toHaveAttribute("aria-errormessage", "feedback-warning");
    await expect(votersAndVotesPage.totalAdmittedVotersCount).not.toHaveAttribute("aria-errormessage");

    // Assert fields empty
    await expect(votersAndVotesPage.pollCardCount).toHaveValue("");
    await expect(votersAndVotesPage.proxyCertificateCount).toHaveValue("");
    await expect(votersAndVotesPage.totalAdmittedVotersCount).toHaveValue("3607");

    // Save section without making corrections, assert error that was hidden by W.002
    await votersAndVotesPage.next.click();
    await expect(votersAndVotesPage.error).toContainText("Controleer je antwoorden");
    await expect(votersAndVotesPage.pollCardCount).toHaveAttribute("aria-errormessage", "feedback-error");
    await expect(votersAndVotesPage.proxyCertificateCount).toHaveAttribute("aria-errormessage", "feedback-error");
    await expect(votersAndVotesPage.totalAdmittedVotersCount).toHaveAttribute("aria-errormessage", "feedback-error");
  });

  test.describe("assert correction result", () => {
    const firstDataEntry = dataEntryRequest.data;
    const secondDataEntry = dataEntryWithDifferencesRequest.data;

    async function testCorrection({
      coordinator,
      typist,
      dataEntry,
      entry,
      correction,
      expectResolved,
    }: {
      coordinator: Page;
      typist: Page;
      dataEntry: DataEntry;
      entry: 1 | 2;
      correction: Results;
      expectResolved: boolean;
    }) {
      // Start data entry, go to section with differences
      await typist.goto(`/elections/${dataEntry.election_id}/data-entry/${dataEntry.id}/${entry}`);
      const dataEntryPage = new DataEntryBasePage(typist);
      await dataEntryPage.progressList.votersAndVotes.click();
      const votersAndVotesPage = new VotersAndVotesPage(typist);
      await expect(votersAndVotesPage.fieldset).toBeVisible();

      // Enter corrections
      const { poll_card_count, proxy_certificate_count } = correction.voters_counts;
      await votersAndVotesPage.pollCardCount.fill(String(poll_card_count));
      await votersAndVotesPage.proxyCertificateCount.fill(String(proxy_certificate_count));
      await votersAndVotesPage.next.click();
      await expect(new DifferencesPage(typist).fieldset).toBeVisible();

      // Finalise
      await dataEntryPage.progressList.checkAndSave.click();
      const checkAndSavePage = new CheckAndSavePage(typist);
      await expect(checkAndSavePage.fieldset).toBeVisible();
      await checkAndSavePage.save.click();

      // Assert notification message
      const dataEntryHomePage = new DataEntryHomePage(typist);
      if (expectResolved) {
        await expect(dataEntryHomePage.alertDataEntrySaved).toContainText(
          entry === 1 ? "Eerste invoer is opgeslagen" : "Tweede invoer is opgeslagen",
        );
      } else {
        await expect(dataEntryHomePage.alertDataEntryDifferent).toContainText(
          entry === 1 ? "Let op: verschil met tweede invoer" : "Let op: verschil met eerste invoer",
        );
      }

      // Assert status
      await coordinator.goto(`/elections/${dataEntry.election_id}/status`);
      const electionStatusPage = new ElectionStatus(coordinator);
      if (expectResolved) {
        await expect(electionStatusPage.definitive).toContainText(dataEntry.name);
      } else {
        await expect(electionStatusPage.errorsAndWarnings).toContainText(dataEntry.name);
      }
    }

    // eslint-disable-next-line playwright/expect-expect
    test("first entry correction differences resolved", async ({
      coordinatorOneGSB,
      typistOneGSB,
      dataEntryGSBFirstEntryCorrection,
    }) => {
      await testCorrection({
        coordinator: coordinatorOneGSB.page,
        typist: typistOneGSB.page,
        dataEntry: dataEntryGSBFirstEntryCorrection,
        entry: 1,
        correction: secondDataEntry,
        expectResolved: true,
      });
    });

    // eslint-disable-next-line playwright/expect-expect
    test("first entry correction differences remain", async ({
      coordinatorOneGSB,
      typistOneGSB,
      dataEntryGSBFirstEntryCorrection,
    }) => {
      await testCorrection({
        coordinator: coordinatorOneGSB.page,
        typist: typistOneGSB.page,
        dataEntry: dataEntryGSBFirstEntryCorrection,
        entry: 1,
        correction: firstDataEntry,
        expectResolved: false,
      });
    });

    // eslint-disable-next-line playwright/expect-expect
    test("second entry correction differences resolved", async ({
      coordinatorOneGSB,
      typistTwoGSB,
      dataEntryGSBSecondEntryCorrection,
    }) => {
      await testCorrection({
        coordinator: coordinatorOneGSB.page,
        typist: typistTwoGSB.page,
        dataEntry: dataEntryGSBSecondEntryCorrection,
        entry: 2,
        correction: firstDataEntry,
        expectResolved: true,
      });
    });

    // eslint-disable-next-line playwright/expect-expect
    test("second entry correction differences remain", async ({
      coordinatorOneGSB,
      typistTwoGSB,
      dataEntryGSBSecondEntryCorrection,
    }) => {
      await testCorrection({
        coordinator: coordinatorOneGSB.page,
        typist: typistTwoGSB.page,
        dataEntry: dataEntryGSBSecondEntryCorrection,
        entry: 2,
        correction: secondDataEntry,
        expectResolved: false,
      });
    });
  });

  test("typist discards a second entry correction", async ({
    coordinatorOneGSB,
    typistTwoGSB,
    dataEntryGSBSecondEntryCorrection: dataEntry,
  }) => {
    const coordinator = coordinatorOneGSB.page;
    await coordinator.goto(`/elections/${dataEntry.election_id}/status`);

    const electionStatusPage = new ElectionStatus(coordinator);
    await expect(electionStatusPage.inProgress).toContainText(
      [dataEntry.name, "2e invoer", "Aliyah van den Berg"].join(""),
    );

    // the typist correcting the second entry abandons the correction
    const typist = typistTwoGSB.page;
    await typist.goto(`/elections/${dataEntry.election_id}/data-entry/${dataEntry.id}/2`);

    const dataEntryPage = new DataEntryBasePage(typist);
    await dataEntryPage.abortInput.click();

    const abortInputModal = new AbortInputModal(typist);
    await expect(abortInputModal.heading).toBeVisible();
    await abortInputModal.discardInput.click();

    const dataEntryHomePage = new DataEntryHomePage(typist);
    await expect(dataEntryHomePage.fieldset).toBeVisible();

    // the finalised first entry is kept, so a new second entry can be started
    await coordinator.goto(`/elections/${dataEntry.election_id}/status`);
    await expect(electionStatusPage.firstEntryFinished).toContainText(`${dataEntry.name}Sam Kuijpers`);
  });

  test("typist discards a first entry correction", async ({
    coordinatorOneGSB,
    typistOneGSB,
    dataEntryGSBFirstEntryCorrection: dataEntry,
  }) => {
    const coordinator = coordinatorOneGSB.page;
    await coordinator.goto(`/elections/${dataEntry.election_id}/status`);

    const electionStatusPage = new ElectionStatus(coordinator);
    await expect(electionStatusPage.inProgress).toContainText([dataEntry.name, "1e invoer", "Sam Kuijpers"].join(""));

    // the typist correcting the first entry abandons the correction
    const typist = typistOneGSB.page;
    await typist.goto(`/elections/${dataEntry.election_id}/data-entry/${dataEntry.id}/1`);

    const dataEntryPage = new DataEntryBasePage(typist);
    await dataEntryPage.abortInput.click();

    const abortInputModal = new AbortInputModal(typist);
    await expect(abortInputModal.heading).toBeVisible();
    await abortInputModal.discardInput.click();

    const dataEntryHomePage = new DataEntryHomePage(typist);
    await expect(dataEntryHomePage.fieldset).toBeVisible();

    // the kept second entry has become the finalised first entry
    await coordinator.goto(`/elections/${dataEntry.election_id}/status`);
    await expect(electionStatusPage.firstEntryFinished).toContainText(`${dataEntry.name}Aliyah van den Berg`);
  });
});

import { expect } from "@playwright/test";
import { CheckAndSavePage } from "e2e-tests/page-objects/data_entry/CheckAndSavePgObj";
import { ExtraInvestigationPage } from "e2e-tests/page-objects/data_entry/ExtraInvestigationPgObj";
import { VotersAndVotesPage } from "e2e-tests/page-objects/data_entry/VotersAndVotesPgObj";
import { ElectionStatus } from "e2e-tests/page-objects/election/ElectionStatusPgObj";
import { ResolveErrorsPgObj } from "e2e-tests/page-objects/election/ResolveErrorsPgObj";
import { test } from "../../fixtures";

test.use({
  storageState: "e2e-tests/state/coordinator1-GSB.json",
});

test.describe("resolve errors", () => {
  test("do not proceed when no action is chosen", async ({ page, dataEntryGSBFirstEntryHasErrors }) => {
    await page.goto(`/elections/${dataEntryGSBFirstEntryHasErrors.election_id}/status`);

    const electionStatusPage = new ElectionStatus(page);
    await electionStatusPage.errorsAndWarnings.getByRole("row", { name: dataEntryGSBFirstEntryHasErrors.name }).click();

    const resolveErrorsPage = new ResolveErrorsPgObj(page);
    await resolveErrorsPage.save.click();
    await expect(resolveErrorsPage.validationError).toBeVisible();
  });

  test("resume first entry", async ({ page, dataEntryGSBFirstEntryHasErrors }) => {
    await page.goto(`/elections/${dataEntryGSBFirstEntryHasErrors.election_id}/status`);

    const electionStatusPage = new ElectionStatus(page);
    await electionStatusPage.errorsAndWarnings.getByRole("row", { name: dataEntryGSBFirstEntryHasErrors.name }).click();

    const resolveErrorsPage = new ResolveErrorsPgObj(page);
    await resolveErrorsPage.resumeFirstEntry.click();
    await resolveErrorsPage.save.click();

    await expect(electionStatusPage.inProgress).toContainText(dataEntryGSBFirstEntryHasErrors.name);
    await expect(electionStatusPage.alertFirstDataEntryResumed).toBeVisible();
  });

  test("typist can navigate all sections of a resumed first entry", async ({
    page,
    typistOneGSB,
    dataEntryGSBFirstEntryHasErrors,
  }) => {
    await page.goto(`/elections/${dataEntryGSBFirstEntryHasErrors.election_id}/status`);

    const electionStatusPage = new ElectionStatus(page);
    await electionStatusPage.errorsAndWarnings.getByRole("row", { name: dataEntryGSBFirstEntryHasErrors.name }).click();

    const resolveErrorsPage = new ResolveErrorsPgObj(page);
    await resolveErrorsPage.resumeFirstEntry.click();
    await resolveErrorsPage.save.click();
    await expect(electionStatusPage.inProgress).toContainText(dataEntryGSBFirstEntryHasErrors.name);

    // the typist gets the completed entry back, starting at the first section
    const typistPage = typistOneGSB.page;
    await typistPage.goto(
      `/elections/${dataEntryGSBFirstEntryHasErrors.election_id}/data-entry/${dataEntryGSBFirstEntryHasErrors.id}/1`,
    );

    const extraInvestigationPage = new ExtraInvestigationPage(typistPage);
    await expect(extraInvestigationPage.fieldset).toBeVisible();

    // every section is reachable again, including the last one
    await extraInvestigationPage.progressList.checkAndSave.click();

    const checkAndSavePage = new CheckAndSavePage(typistPage);
    await expect(checkAndSavePage.fieldset).toBeVisible();

    // and the errors have to be accepted again before the entry can be finalised
    await checkAndSavePage.progressList.votersAndVotes.click();

    const votersAndVotesPage = new VotersAndVotesPage(typistPage);
    await expect(votersAndVotesPage.error).toContainText("F.201");
    await expect(votersAndVotesPage.acceptErrorsAndWarnings).not.toBeChecked();
  });

  test("discard first entry", async ({ page, dataEntryGSBFirstEntryHasErrors }) => {
    await page.goto(`/elections/${dataEntryGSBFirstEntryHasErrors.election_id}/status`);

    const electionStatusPage = new ElectionStatus(page);
    await electionStatusPage.errorsAndWarnings.getByRole("row", { name: dataEntryGSBFirstEntryHasErrors.name }).click();

    const resolveErrorsPage = new ResolveErrorsPgObj(page);
    await resolveErrorsPage.discardFirstEntry.click();
    await resolveErrorsPage.save.click();

    await expect(electionStatusPage.notStarted).toContainText(dataEntryGSBFirstEntryHasErrors.name);
    await expect(electionStatusPage.alertFirstDataEntryDiscarded).toBeVisible();
  });
});

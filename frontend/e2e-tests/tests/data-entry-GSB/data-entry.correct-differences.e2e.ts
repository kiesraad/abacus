import { expect } from "@playwright/test";
import { AbortInputModal } from "e2e-tests/page-objects/data_entry/AbortInputModalPgObj";
import { DataEntryBasePage } from "e2e-tests/page-objects/data_entry/DataEntryBasePgObj";
import { DataEntryHomePage } from "e2e-tests/page-objects/data_entry/DataEntryHomePgObj";
import { ElectionStatus } from "e2e-tests/page-objects/election/ElectionStatusPgObj";
import { ResolveDifferencesPgObj } from "e2e-tests/page-objects/election/ResolveDifferencesPgObj";
import { test } from "../../fixtures";

test.use({
  storageState: "e2e-tests/state/coordinator1-GSB.json",
});

test.describe("data entry - correct differences", () => {
  test("typist discards a second entry correction", async ({ page, typistTwoGSB, dataEntryGSBEntriesDifferent }) => {
    await page.goto(`/elections/${dataEntryGSBEntriesDifferent.election_id}/status`);

    const electionStatusPage = new ElectionStatus(page);
    await electionStatusPage.errorsAndWarnings.getByRole("row", { name: dataEntryGSBEntriesDifferent.name }).click();

    const resolveDifferencesPage = new ResolveDifferencesPgObj(page);
    await resolveDifferencesPage.keepFirstEntry.click();
    await resolveDifferencesPage.correctWrongEntry.click();
    await resolveDifferencesPage.save.click();

    await expect(electionStatusPage.inProgress).toContainText(
      [dataEntryGSBEntriesDifferent.name, "2e invoer", "Aliyah van den Berg"].join(""),
    );

    // the typist correcting the second entry abandons the correction
    const typistPage = typistTwoGSB.page;
    await typistPage.goto(
      `/elections/${dataEntryGSBEntriesDifferent.election_id}/data-entry/${dataEntryGSBEntriesDifferent.id}/2`,
    );

    const dataEntryPage = new DataEntryBasePage(typistPage);
    await dataEntryPage.abortInput.click();

    const abortInputModal = new AbortInputModal(typistPage);
    await expect(abortInputModal.heading).toBeVisible();
    await abortInputModal.discardInput.click();

    const dataEntryHomePage = new DataEntryHomePage(typistPage);
    await expect(dataEntryHomePage.fieldset).toBeVisible();

    // the finalised first entry is kept, so a new second entry can be started
    await page.goto(`/elections/${dataEntryGSBEntriesDifferent.election_id}/status`);
    await expect(electionStatusPage.firstEntryFinished).toContainText(
      `${dataEntryGSBEntriesDifferent.name}Sam Kuijpers`,
    );
  });

  test("typist discards a first entry correction", async ({ page, typistOneGSB, dataEntryGSBEntriesDifferent }) => {
    await page.goto(`/elections/${dataEntryGSBEntriesDifferent.election_id}/status`);

    const electionStatusPage = new ElectionStatus(page);
    await electionStatusPage.errorsAndWarnings.getByRole("row", { name: dataEntryGSBEntriesDifferent.name }).click();

    const resolveDifferencesPage = new ResolveDifferencesPgObj(page);
    await resolveDifferencesPage.keepSecondEntry.click();
    await resolveDifferencesPage.correctWrongEntry.click();
    await resolveDifferencesPage.save.click();

    await expect(electionStatusPage.inProgress).toContainText(
      [dataEntryGSBEntriesDifferent.name, "1e invoer", "Sam Kuijpers"].join(""),
    );

    // the typist correcting the first entry abandons the correction
    const typistPage = typistOneGSB.page;
    await typistPage.goto(
      `/elections/${dataEntryGSBEntriesDifferent.election_id}/data-entry/${dataEntryGSBEntriesDifferent.id}/1`,
    );

    const dataEntryPage = new DataEntryBasePage(typistPage);
    await dataEntryPage.abortInput.click();

    const abortInputModal = new AbortInputModal(typistPage);
    await expect(abortInputModal.heading).toBeVisible();
    await abortInputModal.discardInput.click();

    const dataEntryHomePage = new DataEntryHomePage(typistPage);
    await expect(dataEntryHomePage.fieldset).toBeVisible();

    // the kept second entry has become the finalised first entry
    await page.goto(`/elections/${dataEntryGSBEntriesDifferent.election_id}/status`);
    await expect(electionStatusPage.firstEntryFinished).toContainText(
      `${dataEntryGSBEntriesDifferent.name}Aliyah van den Berg`,
    );
  });
});

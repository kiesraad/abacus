import { expect } from "@playwright/test";
import { ElectionStatus } from "e2e-tests/page-objects/election/ElectionStatusPgObj";
import { ResolveDifferencesPgObj } from "e2e-tests/page-objects/election/ResolveDifferencesPgObj";

import { test } from "../../fixtures";

test.use({
  storageState: "e2e-tests/state/coordinator.json",
});

test.describe("resolve differences", () => {
  test("do not proceed when no action is chosen", async ({ page, pollingStationEntriesDifferent: pollingStation }) => {
    await page.goto(`/elections/${pollingStation.election_id}/status`);

    const electionStatusPage = new ElectionStatus(page);
    await electionStatusPage.errorsAndWarnings.getByRole("row", { name: pollingStation.name }).click();

    const resolveDifferencesPage = new ResolveDifferencesPgObj(page);
    await resolveDifferencesPage.save.click();
    await expect(resolveDifferencesPage.validationError).toBeVisible();
  });

  test("keep first entry", async ({ page, pollingStationEntriesDifferent: pollingStation }) => {
    await page.goto(`/elections/${pollingStation.election_id}/status`);

    const electionStatusPage = new ElectionStatus(page);
    await electionStatusPage.errorsAndWarnings.getByRole("row", { name: pollingStation.name }).click();

    const resolveDifferencesPage = new ResolveDifferencesPgObj(page);
    await resolveDifferencesPage.keepFirstEntry.click();
    await expect(resolveDifferencesPage.firstValue).toHaveClass(/keep/);
    await expect(resolveDifferencesPage.secondValue).toHaveClass(/discard/);
    await resolveDifferencesPage.save.click();

    await expect(electionStatusPage.firstEntryFinished).toContainText(pollingStation.name + "Sam Kuijpers");
    await expect(electionStatusPage.alertFirstDataEntryKept).toBeVisible();
  });

  test("keep second entry", async ({ page, pollingStationEntriesDifferent: pollingStation }) => {
    await page.goto(`/elections/${pollingStation.election_id}/status`);

    const electionStatusPage = new ElectionStatus(page);
    await electionStatusPage.errorsAndWarnings.getByRole("row", { name: pollingStation.name }).click();

    const resolveDifferencesPage = new ResolveDifferencesPgObj(page);
    await resolveDifferencesPage.keepSecondEntry.click();
    await expect(resolveDifferencesPage.firstValue).toHaveClass(/discard/);
    await expect(resolveDifferencesPage.secondValue).toHaveClass(/keep/);
    await resolveDifferencesPage.save.click();

    await expect(electionStatusPage.firstEntryFinished).toContainText(pollingStation.name + "Aliyah van den Berg");
    await expect(electionStatusPage.alertSecondDataEntryKept).toBeVisible();
  });

  test("discard both", async ({ page, pollingStationEntriesDifferent: pollingStation }) => {
    await page.goto(`/elections/${pollingStation.election_id}/status`);

    const electionStatusPage = new ElectionStatus(page);
    await electionStatusPage.errorsAndWarnings.getByRole("row", { name: pollingStation.name }).click();

    const resolveDifferencesPage = new ResolveDifferencesPgObj(page);
    await resolveDifferencesPage.discardBothEntries.click();
    await expect(resolveDifferencesPage.firstValue).toHaveClass(/discard/);
    await expect(resolveDifferencesPage.secondValue).toHaveClass(/discard/);
    await resolveDifferencesPage.save.click();

    await expect(electionStatusPage.notStarted).toContainText(pollingStation.name);
    await expect(electionStatusPage.alertDataEntriesDiscarded).toBeVisible();
  });
});

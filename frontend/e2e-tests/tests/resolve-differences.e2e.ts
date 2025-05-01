import { expect } from "@playwright/test";
import { ElectionStatus } from "e2e-tests/page-objects/election/ElectionStatusPgObj";

import { test } from "../fixtures";
import { ResolveDifferencesPgObj } from "../page-objects/election/ResolveDifferencesPgObj";

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
    await expect((await resolveDifferencesPage.dataEntryValues)[0]!).toHaveClass(/keep/);
    await expect((await resolveDifferencesPage.dataEntryValues)[1]!).toHaveClass(/discard/);
    await resolveDifferencesPage.save.click();

    await expect(electionStatusPage.firstEntryFinished).toContainText(pollingStation.name + "Sam Kuijpers");
  });

  test("keep second entry", async ({ page, pollingStationEntriesDifferent: pollingStation }) => {
    await page.goto(`/elections/${pollingStation.election_id}/status`);

    const electionStatusPage = new ElectionStatus(page);
    await electionStatusPage.errorsAndWarnings.getByRole("row", { name: pollingStation.name }).click();

    const resolveDifferencesPage = new ResolveDifferencesPgObj(page);
    await resolveDifferencesPage.keepSecondEntry.click();
    await expect((await resolveDifferencesPage.dataEntryValues)[0]!).toHaveClass(/discard/);
    await expect((await resolveDifferencesPage.dataEntryValues)[1]!).toHaveClass(/keep/);
    await resolveDifferencesPage.save.click();

    await expect(electionStatusPage.firstEntryFinished).toContainText(pollingStation.name + "Aliyah van den Berg");
  });

  test("discard both", async ({ page, pollingStationEntriesDifferent: pollingStation }) => {
    await page.goto(`/elections/${pollingStation.election_id}/status`);

    const electionStatusPage = new ElectionStatus(page);
    await electionStatusPage.errorsAndWarnings.getByRole("row", { name: pollingStation.name }).click();

    const resolveDifferencesPage = new ResolveDifferencesPgObj(page);
    await resolveDifferencesPage.discardBothEntries.click();
    await expect((await resolveDifferencesPage.dataEntryValues)[0]!).toHaveClass(/discard/);
    await expect((await resolveDifferencesPage.dataEntryValues)[1]!).toHaveClass(/discard/);
    await resolveDifferencesPage.save.click();

    await expect(electionStatusPage.notStarted).toContainText(pollingStation.name);
  });
});

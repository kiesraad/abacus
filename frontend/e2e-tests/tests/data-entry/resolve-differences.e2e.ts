import { expect } from "@playwright/test";
import { ElectionStatus } from "e2e-tests/page-objects/election/ElectionStatusPgObj";
import { ResolveDifferencesPgObj } from "e2e-tests/page-objects/election/ResolveDifferencesPgObj";

import { test } from "../../fixtures";
import { ResolveErrorsPgObj } from "../../page-objects/election/ResolveErrorsPgObj";

test.use({
  storageState: "e2e-tests/state/coordinator1.json",
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
    await expect(electionStatusPage.alertDifferencesResolved).toBeVisible();
    await expect(electionStatusPage.alertDifferencesResolved).toContainText(
      "Omdat er nog maar één invoer over is, moet er een nieuwe tweede invoer gedaan worden. Kies hiervoor een andere invoerder dan Sam Kuijpers.",
    );
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
    await expect(electionStatusPage.alertDifferencesResolved).toBeVisible();
    await expect(electionStatusPage.alertDifferencesResolved).toContainText(
      "Omdat er nog maar één invoer over is, moet er een nieuwe tweede invoer gedaan worden. Kies hiervoor een andere invoerder dan Aliyah van den Berg.",
    );
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
    await expect(electionStatusPage.alertDifferencesResolved).toBeVisible();
    await expect(electionStatusPage.alertDifferencesResolved).toContainText(
      "Omdat beide invoeren zijn verwijderd, moet stembureau 33 twee keer opnieuw ingevoerd worden.",
    );
  });
});

test.describe("resolve differences then errors", () => {
  test("keep second entry with errors then resolve errors", async ({
    page,
    pollingStationEntriesDifferentWithErrors: pollingStation,
  }) => {
    await page.goto(`/elections/${pollingStation.election_id}/status`);

    const electionStatusPage = new ElectionStatus(page);
    await electionStatusPage.errorsAndWarnings.getByRole("row", { name: pollingStation.name }).click();

    const resolveDifferencesPage = new ResolveDifferencesPgObj(page);
    await expect(resolveDifferencesPage.title).toBeVisible();
    await resolveDifferencesPage.keepSecondEntry.click();
    await resolveDifferencesPage.save.click();

    const resolveErrorsPage = new ResolveErrorsPgObj(page);
    await expect(resolveErrorsPage.title).toBeVisible();
    await expect(resolveErrorsPage.alertDifferencesResolved).toBeVisible();
    await resolveErrorsPage.resumeFirstEntry.click();
    await resolveErrorsPage.save.click();

    await expect(electionStatusPage.inProgress).toContainText(pollingStation.name);
    await expect(electionStatusPage.alertFirstDataEntryResumed).toBeVisible();
  });
});

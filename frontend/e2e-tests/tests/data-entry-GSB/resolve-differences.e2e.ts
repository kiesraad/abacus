import { expect } from "@playwright/test";
import { ElectionStatus } from "e2e-tests/page-objects/election/ElectionStatusPgObj";
import { ResolveDifferencesPgObj } from "e2e-tests/page-objects/election/ResolveDifferencesPgObj";
import { ResolveErrorsPgObj } from "e2e-tests/page-objects/election/ResolveErrorsPgObj";
import { test } from "../../fixtures";

test.use({
  storageState: "e2e-tests/state/coordinator1-GSB.json",
});

test.describe("resolve differences", () => {
  test("do not proceed until both questions are answered", async ({ page, dataEntryGSBEntriesDifferent }) => {
    await page.goto(`/elections/${dataEntryGSBEntriesDifferent.election_id}/status`);

    const electionStatusPage = new ElectionStatus(page);
    await electionStatusPage.errorsAndWarnings.getByRole("row", { name: dataEntryGSBEntriesDifferent.name }).click();

    const resolveDifferencesPage = new ResolveDifferencesPgObj(page);

    // The second question is disabled until an entry is chosen
    await expect(resolveDifferencesPage.correctWrongEntry).toBeDisabled();
    await expect(resolveDifferencesPage.reenterWrongEntry).toBeDisabled();

    // Saving without answering the first question shows an error and stays on the page
    await resolveDifferencesPage.save.click();
    await expect(resolveDifferencesPage.validationError).toBeVisible();
    await expect(resolveDifferencesPage.title).toBeVisible();

    // Choosing an entry enables the second question, but saving without answering it still errors
    await resolveDifferencesPage.keepFirstEntry.click();
    await expect(resolveDifferencesPage.reenterWrongEntry).toBeEnabled();
    await resolveDifferencesPage.save.click();
    await expect(resolveDifferencesPage.validationError).toBeVisible();
    await expect(resolveDifferencesPage.title).toBeVisible();
  });

  test("keep first entry", async ({ page, dataEntryGSBEntriesDifferent }) => {
    await page.goto(`/elections/${dataEntryGSBEntriesDifferent.election_id}/status`);

    const electionStatusPage = new ElectionStatus(page);
    await electionStatusPage.errorsAndWarnings.getByRole("row", { name: dataEntryGSBEntriesDifferent.name }).click();

    const resolveDifferencesPage = new ResolveDifferencesPgObj(page);
    await resolveDifferencesPage.keepFirstEntry.click();
    await expect(resolveDifferencesPage.firstValue).toHaveClass(/keep/);
    await expect(resolveDifferencesPage.secondValue).toHaveClass(/discard/);
    await resolveDifferencesPage.reenterWrongEntry.click();
    await resolveDifferencesPage.save.click();

    await expect(electionStatusPage.firstEntryFinished).toContainText(
      `${dataEntryGSBEntriesDifferent.name}Sam Kuijpers`,
    );
    await expect(electionStatusPage.alertDifferencesResolved).toBeVisible();
    await expect(electionStatusPage.alertDifferencesResolved).toContainText(
      "Omdat er nog maar één invoer over is, moet er een nieuwe tweede invoer gedaan worden. Kies hiervoor een andere invoerder dan Sam Kuijpers.",
    );
  });

  test("keep first entry and let the original typist correct the second", async ({
    page,
    dataEntryGSBEntriesDifferent,
  }) => {
    await page.goto(`/elections/${dataEntryGSBEntriesDifferent.election_id}/status`);

    const electionStatusPage = new ElectionStatus(page);
    await electionStatusPage.errorsAndWarnings.getByRole("row", { name: dataEntryGSBEntriesDifferent.name }).click();

    const resolveDifferencesPage = new ResolveDifferencesPgObj(page);
    await resolveDifferencesPage.keepFirstEntry.click();
    await expect(resolveDifferencesPage.firstValue).toHaveClass(/keep/);
    await expect(resolveDifferencesPage.secondValue).toHaveClass(/discard/);
    await resolveDifferencesPage.correctWrongEntry.click();
    await resolveDifferencesPage.save.click();

    await expect(electionStatusPage.firstEntryFinished).toContainText(
      `${dataEntryGSBEntriesDifferent.name}Sam Kuijpers`,
    );
    await expect(electionStatusPage.alertDifferencesResolved).toBeVisible();
    await expect(electionStatusPage.alertDifferencesResolved).toContainText(
      "De invoer die niet klopt moet worden hersteld door Aliyah van den Berg.",
    );
  });

  test("keep second entry", async ({ page, dataEntryGSBEntriesDifferent }) => {
    await page.goto(`/elections/${dataEntryGSBEntriesDifferent.election_id}/status`);

    const electionStatusPage = new ElectionStatus(page);
    await electionStatusPage.errorsAndWarnings.getByRole("row", { name: dataEntryGSBEntriesDifferent.name }).click();

    const resolveDifferencesPage = new ResolveDifferencesPgObj(page);
    await resolveDifferencesPage.keepSecondEntry.click();
    await expect(resolveDifferencesPage.firstValue).toHaveClass(/discard/);
    await expect(resolveDifferencesPage.secondValue).toHaveClass(/keep/);
    await resolveDifferencesPage.reenterWrongEntry.click();
    await resolveDifferencesPage.save.click();

    await expect(electionStatusPage.firstEntryFinished).toContainText(
      `${dataEntryGSBEntriesDifferent.name}Aliyah van den Berg`,
    );
    await expect(electionStatusPage.alertDifferencesResolved).toBeVisible();
    await expect(electionStatusPage.alertDifferencesResolved).toContainText(
      "Omdat er nog maar één invoer over is, moet er een nieuwe tweede invoer gedaan worden. Kies hiervoor een andere invoerder dan Aliyah van den Berg.",
    );
  });

  test("discard both", async ({ page, dataEntryGSBEntriesDifferent }) => {
    await page.goto(`/elections/${dataEntryGSBEntriesDifferent.election_id}/status`);

    const electionStatusPage = new ElectionStatus(page);
    await electionStatusPage.errorsAndWarnings.getByRole("row", { name: dataEntryGSBEntriesDifferent.name }).click();

    const resolveDifferencesPage = new ResolveDifferencesPgObj(page);
    await resolveDifferencesPage.discardBothEntries.click();
    await expect(resolveDifferencesPage.firstValue).toHaveClass(/discard/);
    await expect(resolveDifferencesPage.secondValue).toHaveClass(/discard/);
    await resolveDifferencesPage.save.click();

    await expect(electionStatusPage.notStarted).toContainText(dataEntryGSBEntriesDifferent.name);
    await expect(electionStatusPage.alertDifferencesResolved).toBeVisible();
    await expect(electionStatusPage.alertDifferencesResolved).toContainText(
      "Omdat beide invoeren zijn verwijderd, moet stembureau 33 twee keer opnieuw ingevoerd worden.",
    );
  });
});

test.describe("resolve differences then errors", () => {
  test("keep second entry with errors then resolve errors", async ({
    page,
    dataEntryGSBEntriesDifferentWithErrors,
  }) => {
    await page.goto(`/elections/${dataEntryGSBEntriesDifferentWithErrors.election_id}/status`);

    const electionStatusPage = new ElectionStatus(page);
    await electionStatusPage.errorsAndWarnings
      .getByRole("row", { name: dataEntryGSBEntriesDifferentWithErrors.name })
      .click();

    const resolveDifferencesPage = new ResolveDifferencesPgObj(page);
    await expect(resolveDifferencesPage.title).toBeVisible();
    await resolveDifferencesPage.keepSecondEntry.click();
    await resolveDifferencesPage.reenterWrongEntry.click();
    await resolveDifferencesPage.save.click();

    const resolveErrorsPage = new ResolveErrorsPgObj(page);
    await expect(resolveErrorsPage.title).toBeVisible();
    await expect(resolveErrorsPage.alertDifferencesResolved).toBeVisible();
    await resolveErrorsPage.resumeFirstEntry.click();
    await resolveErrorsPage.save.click();

    await expect(electionStatusPage.inProgress).toContainText(dataEntryGSBEntriesDifferentWithErrors.name);
    await expect(electionStatusPage.alertFirstDataEntryResumed).toBeVisible();
  });
});

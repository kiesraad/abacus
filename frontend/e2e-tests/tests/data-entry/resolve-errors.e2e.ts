import { expect } from "@playwright/test";
import { ElectionStatus } from "e2e-tests/page-objects/election/ElectionStatusPgObj";
import { ResolveErrorsPgObj } from "e2e-tests/page-objects/election/ResolveErrorsPgObj";
import { test } from "../../fixtures";

test.use({
  storageState: "e2e-tests/state/coordinator1.json",
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

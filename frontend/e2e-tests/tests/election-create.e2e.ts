import { expect } from "@playwright/test";
import { CheckAndSavePgObj } from "e2e-tests/page-objects/election/create/CheckAndSavePgObj";
import { CheckCandidateDefinitionPgObj } from "e2e-tests/page-objects/election/create/CheckCandidateDefinitionPgObj";
import { CheckDefinitionPgObj } from "e2e-tests/page-objects/election/create/CheckDefinitionPgObj";
import { UploadCandidateDefinitionPgObj } from "e2e-tests/page-objects/election/create/UploadCandidateDefinitionPgObj";
import { UploadDefinitionPgObj } from "e2e-tests/page-objects/election/create/UploadDefinitionPgObj";
import { OverviewPgObj } from "e2e-tests/page-objects/election/OverviewPgObj";

import { test } from "../fixtures";
import { eml110a, eml110b, eml230b } from "../test-data/eml-files";

test.use({
  storageState: "e2e-tests/state/admin.json",
});

test.describe("Election creation", () => {
  test("it uploads an election file and candidate list", async ({ page }) => {
    await page.goto("/elections");
    const overviewPage = new OverviewPgObj(page);
    const initialElectionCount = await overviewPage.elections.count();
    const initialReadyStateCount = await overviewPage.electionsInReadyState.count();
    await overviewPage.create.click();

    const uploadDefinitionPage = new UploadDefinitionPgObj(page);
    await expect(uploadDefinitionPage.header).toBeVisible();
    await uploadDefinitionPage.uploadFile(page, eml110a.path);

    const checkDefinitionPage = new CheckDefinitionPgObj(page);
    await expect(checkDefinitionPage.header).toBeVisible();
    await expect(overviewPage.main).toContainText(eml110a.filename);
    await expect(overviewPage.main).toContainText(eml110a.electionDate);

    await expect(checkDefinitionPage.hashInput1).toBeFocused();
    await checkDefinitionPage.hashInput1.fill(eml110a.hashInput1);
    await checkDefinitionPage.hashInput2.fill(eml110a.hashInput2);
    await checkDefinitionPage.next.click();

    // Candidate page
    const uploadCandidateDefinitionPage = new UploadCandidateDefinitionPgObj(page);
    await expect(uploadCandidateDefinitionPage.header).toBeVisible();
    await uploadCandidateDefinitionPage.uploadFile(page, eml230b.path);

    // Candidate check page
    const checkCandidateDefinitionPage = new CheckCandidateDefinitionPgObj(page);
    await expect(checkCandidateDefinitionPage.header).toBeVisible();
    await expect(overviewPage.main).toContainText(eml230b.filename);
    await expect(overviewPage.main).toContainText(eml230b.electionDate);
    await expect(checkCandidateDefinitionPage.hashInput1).toBeFocused();
    await checkCandidateDefinitionPage.hashInput1.fill(eml230b.hashInput1);
    await checkCandidateDefinitionPage.hashInput2.fill(eml230b.hashInput2);
    await checkCandidateDefinitionPage.next.click();

    // Now we should be at the check and save page
    const checkAndSavePage = new CheckAndSavePgObj(page);
    await expect(checkAndSavePage.header).toBeVisible();
    await checkAndSavePage.save.click();

    await expect(overviewPage.header).toBeVisible();
    // Check if the amount of elections by this title is greater than before the import
    expect(await overviewPage.elections.count()).toBeGreaterThan(initialElectionCount);
    // Check if the amount of "Klaar voor invoer states" is greater than before the import
    expect(await overviewPage.electionsInReadyState.count()).toBeGreaterThan(initialReadyStateCount);
  });

  test("it fails on incorrect hash", async ({ page }) => {
    await page.goto("/elections");
    const overviewPage = new OverviewPgObj(page);
    await overviewPage.create.click();

    const uploadDefinitionPage = new UploadDefinitionPgObj(page);
    await expect(uploadDefinitionPage.header).toBeVisible();
    await uploadDefinitionPage.uploadFile(page, eml110a.path);

    const checkDefinitionPage = new CheckDefinitionPgObj(page);
    await expect(checkDefinitionPage.hashInput1).toBeFocused();
    // Wrong hash
    await checkDefinitionPage.hashInput1.fill("1234");
    await checkDefinitionPage.hashInput2.fill("asdf");
    await checkDefinitionPage.next.click();
    await expect(checkDefinitionPage.error).toBeVisible();
  });

  test("it fails on valid, but incorrect file", async ({ page }) => {
    await page.goto("/elections");
    const overviewPage = new OverviewPgObj(page);
    await overviewPage.create.click();

    const uploadDefinitionPage = new UploadDefinitionPgObj(page);
    await expect(uploadDefinitionPage.header).toBeVisible();
    await uploadDefinitionPage.uploadFile(page, eml110b.path);
    await expect(uploadDefinitionPage.error).toBeVisible();
  });

  test("it fails on incorrect hash for candidate list", async ({ page }) => {
    await page.goto("/elections");
    const overviewPage = new OverviewPgObj(page);
    await overviewPage.create.click();

    const uploadDefinitionPage = new UploadDefinitionPgObj(page);
    await expect(uploadDefinitionPage.header).toBeVisible();
    await uploadDefinitionPage.uploadFile(page, eml110a.path);

    const checkDefinitionPage = new CheckDefinitionPgObj(page);
    await expect(checkDefinitionPage.header).toBeVisible();
    await expect(overviewPage.main).toContainText(eml110a.filename);
    await expect(overviewPage.main).toContainText(eml110a.electionDate);
    await expect(checkDefinitionPage.hashInput1).toBeFocused();
    await checkDefinitionPage.hashInput1.fill(eml110a.hashInput1);
    await checkDefinitionPage.hashInput2.fill(eml110a.hashInput2);
    await checkDefinitionPage.next.click();

    // Candidate page
    const uploadCandidateDefinitionPage = new UploadCandidateDefinitionPgObj(page);
    await expect(uploadCandidateDefinitionPage.header).toBeVisible();
    await uploadCandidateDefinitionPage.uploadFile(page, eml230b.path);

    // Candidate check page
    const checkCandidateDefinitionPage = new CheckCandidateDefinitionPgObj(page);
    await expect(checkCandidateDefinitionPage.header).toBeVisible();
    await expect(overviewPage.main).toContainText(eml230b.filename);
    await expect(overviewPage.main).toContainText(eml230b.electionDate);
    await expect(checkCandidateDefinitionPage.hashInput1).toBeFocused();
    await checkCandidateDefinitionPage.hashInput1.fill("1234");
    await checkCandidateDefinitionPage.hashInput2.fill("1234");
    await checkCandidateDefinitionPage.next.click();

    await expect(checkCandidateDefinitionPage.error).toBeVisible();
  });

  test("it fails on valid, but incorrect file for candidate list", async ({ page }) => {
    await page.goto("/elections");
    const overviewPage = new OverviewPgObj(page);
    await overviewPage.create.click();

    const uploadDefinitionPage = new UploadDefinitionPgObj(page);
    await expect(uploadDefinitionPage.header).toBeVisible();
    await uploadDefinitionPage.uploadFile(page, eml110a.path);

    const checkDefinitionPage = new CheckDefinitionPgObj(page);
    await expect(checkDefinitionPage.header).toBeVisible();
    await expect(overviewPage.main).toContainText(eml110a.filename);
    await expect(overviewPage.main).toContainText(eml110a.electionDate);
    await expect(checkDefinitionPage.hashInput1).toBeFocused();
    await checkDefinitionPage.hashInput1.fill(eml110a.hashInput1);
    await checkDefinitionPage.hashInput2.fill(eml110a.hashInput2);
    await checkDefinitionPage.next.click();

    // Candidate page
    const uploadCandidateDefinitionPage = new UploadCandidateDefinitionPgObj(page);
    await expect(uploadCandidateDefinitionPage.header).toBeVisible();
    await uploadCandidateDefinitionPage.uploadFile(page, eml110b.path);
    await expect(uploadCandidateDefinitionPage.error).toBeVisible();
  });
});

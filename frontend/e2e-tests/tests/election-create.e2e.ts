import { expect } from "@playwright/test";
import {
  uploadCandidatesAndInputHash,
  uploadElectionAndInputHash,
} from "e2e-tests/helpers-utils/e2e-test-browser-helpers";
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
    // const initialReadyStateCount = await overviewPage.electionsInReadyState.count();
    await overviewPage.create.click();

    // upload election and check hash
    await uploadElectionAndInputHash(page);

    // upload candidates list and check hash
    await uploadCandidatesAndInputHash(page);

    // Now we should be at the check and save page
    const checkAndSavePage = new CheckAndSavePgObj(page);
    await expect(checkAndSavePage.header).toBeVisible();
    await checkAndSavePage.save.click();

    await expect(overviewPage.header).toBeVisible();
    // Check if the amount of elections by this title is greater than before the import
    expect(await overviewPage.elections.count()).toBeGreaterThan(initialElectionCount);
    // TODO: Uncomment this when issue #1649 is finished
    // // Check if the amount of "Klaar voor invoer states" is greater than before the import
    // expect(await overviewPage.electionsInReadyState.count()).toBeGreaterThan(initialReadyStateCount);
  });

  test("it fails on incorrect hash", async ({ page }) => {
    await page.goto("/elections");
    const overviewPage = new OverviewPgObj(page);
    await overviewPage.create.click();

    // Upload election
    const uploadDefinitionPage = new UploadDefinitionPgObj(page);
    await expect(uploadDefinitionPage.header).toBeVisible();
    await uploadDefinitionPage.uploadFile(page, eml110a.path);

    // Wrong hash
    const checkDefinitionPage = new CheckDefinitionPgObj(page);
    await checkDefinitionPage.inputHash("1234", "abcd");
    await expect(checkDefinitionPage.error).toBeVisible();
  });

  test("it fails on valid, but incorrect file", async ({ page }) => {
    await page.goto("/elections");
    const overviewPage = new OverviewPgObj(page);
    await overviewPage.create.click();

    // Incorrect file
    const uploadDefinitionPage = new UploadDefinitionPgObj(page);
    await expect(uploadDefinitionPage.header).toBeVisible();
    await uploadDefinitionPage.uploadFile(page, eml110b.path);
    await expect(uploadDefinitionPage.error).toBeVisible();
  });

  test("it fails on incorrect hash for candidate list", async ({ page }) => {
    await page.goto("/elections");
    const overviewPage = new OverviewPgObj(page);
    await overviewPage.create.click();

    // upload election and check hash
    await uploadElectionAndInputHash(page);

    // Candidate page
    const uploadCandidateDefinitionPage = new UploadCandidateDefinitionPgObj(page);
    await expect(uploadCandidateDefinitionPage.header).toBeVisible();
    await uploadCandidateDefinitionPage.uploadFile(page, eml230b.path);

    // Wrong hash
    const checkCandidateDefinitionPage = new CheckCandidateDefinitionPgObj(page);
    await expect(checkCandidateDefinitionPage.header).toBeVisible();
    await checkCandidateDefinitionPage.inputHash("1234", "abcd");
    await expect(checkCandidateDefinitionPage.error).toBeVisible();
  });

  test("it fails on valid, but incorrect file for candidate list", async ({ page }) => {
    await page.goto("/elections");
    const overviewPage = new OverviewPgObj(page);
    await overviewPage.create.click();

    // upload election and check hash
    await uploadElectionAndInputHash(page);

    // Candidate page
    const uploadCandidateDefinitionPage = new UploadCandidateDefinitionPgObj(page);
    await expect(uploadCandidateDefinitionPage.header).toBeVisible();
    await uploadCandidateDefinitionPage.uploadFile(page, eml110b.path);
    await expect(uploadCandidateDefinitionPage.error).toBeVisible();
  });

  test("after election upload, moving back to election page resets election", async ({ page }) => {
    await page.goto("/elections");
    const overviewPage = new OverviewPgObj(page);
    await overviewPage.create.click();

    // upload election and check hash
    await uploadElectionAndInputHash(page);

    // Candidate page
    const uploadCandidateDefinitionPage = new UploadCandidateDefinitionPgObj(page);
    await expect(uploadCandidateDefinitionPage.header).toBeVisible();
    await uploadCandidateDefinitionPage.uploadFile(page, eml230b.path);
    const checkCandidateDefinitionPage = new CheckCandidateDefinitionPgObj(page);
    await expect(checkCandidateDefinitionPage.header).toBeVisible();

    // Back button
    await page.goBack();

    // We should be back at the upload election page
    const uploadDefinitionPage = new UploadDefinitionPgObj(page);
    await expect(uploadDefinitionPage.header).toBeVisible();
  });

  test("after candidate upload, moving back to candidate page resets candidates", async ({ page }) => {
    await page.goto("/elections");
    const overviewPage = new OverviewPgObj(page);
    await overviewPage.create.click();

    // upload election and check hash
    await uploadElectionAndInputHash(page);

    // upload candidates list and check hash
    await uploadCandidatesAndInputHash(page);

    // Now we should be at the check and save page
    const checkAndSavePage = new CheckAndSavePgObj(page);
    await expect(checkAndSavePage.header).toBeVisible();

    // Back button
    await page.goBack();

    // We should be back at the candidate page
    const uploadCandidateDefinitionPage = new UploadCandidateDefinitionPgObj(page);
    await expect(uploadCandidateDefinitionPage.header).toBeVisible();
  });

  test("navigating to list-of-candidates should redirect to create", async ({ page }) => {
    await page.goto("/elections/create/list-of-candidates");

    // Upload election
    const uploadDefinitionPage = new UploadDefinitionPgObj(page);
    await expect(uploadDefinitionPage.header).toBeVisible();
  });

  test("navigate to check-and-save should redirect to create", async ({ page }) => {
    await page.goto("/elections/create/check-and-save");

    // Upload election
    const uploadDefinitionPage = new UploadDefinitionPgObj(page);
    await expect(uploadDefinitionPage.header).toBeVisible();
  });

  // upload election and candidates, then go to start and upload new election,
  // use browser back button should redirect back to election
  test("after resetting an election upload, the back button should redirect to the beginning", async ({ page }) => {
    await page.goto("/elections");
    const overviewPage = new OverviewPgObj(page);
    await overviewPage.create.click();

    // upload election and check hash
    await uploadElectionAndInputHash(page);

    // upload candidates list and check hash
    await uploadCandidatesAndInputHash(page);

    // Now we should be at the check and save page
    const checkAndSavePage = new CheckAndSavePgObj(page);
    await expect(checkAndSavePage.header).toBeVisible();

    // Now upload a new election
    const uploadDefinitionPage = new UploadDefinitionPgObj(page);
    await page.goto("/elections/create");
    await expect(uploadDefinitionPage.header).toBeVisible();
    await uploadDefinitionPage.uploadFile(page, eml110a.path);

    // Back button
    await page.goBack();
    await expect(uploadDefinitionPage.header).toBeVisible();
  });

  test("after the successful creation of new election, the back button should redirect to the beginning", async ({
    page,
  }) => {
    await page.goto("/elections");
    const overviewPage = new OverviewPgObj(page);
    await overviewPage.create.click();

    // upload election and check hash
    await uploadElectionAndInputHash(page);

    // upload candidates list and check hash
    await uploadCandidatesAndInputHash(page);

    // Now we should be at the check and save page
    const checkAndSavePage = new CheckAndSavePgObj(page);
    await expect(checkAndSavePage.header).toBeVisible();
    await checkAndSavePage.save.click();

    // Redefine the Overview page, so we can locate the newly
    await expect(overviewPage.header).toBeVisible();

    // Back button
    await page.goBack();

    // We should be at the election upload page, not the check-and-save
    const uploadDefinitionPage = new UploadDefinitionPgObj(page);
    await expect(uploadDefinitionPage.header).toBeVisible();
  });
});

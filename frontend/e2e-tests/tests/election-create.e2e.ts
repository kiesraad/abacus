import { expect } from "@playwright/test";
import {
  uploadCandidatesAndInputHash,
  uploadElectionAndInputHash,
  uploadPollingStations,
} from "e2e-tests/helpers-utils/e2e-test-browser-helpers";
import { AbortModalPgObj } from "e2e-tests/page-objects/election/create/AbortModalPgObj";
import { CheckAndSavePgObj } from "e2e-tests/page-objects/election/create/CheckAndSavePgObj";
import { CheckCandidateDefinitionPgObj } from "e2e-tests/page-objects/election/create/CheckCandidateDefinitionPgObj";
import { CheckElectionDefinitionPgObj } from "e2e-tests/page-objects/election/create/CheckElectionDefinitionPgObj";
import { CheckPollingStationDefinitionPgObj } from "e2e-tests/page-objects/election/create/CheckPollingStationDefinitionPgObj";
import { CountingMethodTypePgObj } from "e2e-tests/page-objects/election/create/CountingMethodTypePgObj";
import { NumberOfVotersPgObj } from "e2e-tests/page-objects/election/create/NumberOfVotersPgObj";
import { UploadCandidateDefinitionPgObj } from "e2e-tests/page-objects/election/create/UploadCandidateDefinitionPgObj";
import { UploadElectionDefinitionPgObj } from "e2e-tests/page-objects/election/create/UploadElectionDefinitionPgObj";
import { UploadPollingStationDefinitionPgObj } from "e2e-tests/page-objects/election/create/UploadPollingStationDefinitionPgObj";
import { OverviewPgObj } from "e2e-tests/page-objects/election/OverviewPgObj";
import { AdminNavBar } from "e2e-tests/page-objects/nav_bar/AdminNavBarPgObj";

import { Election } from "@/types/generated/openapi";

import { test } from "../fixtures";
import { eml110a, eml110b, eml110b_short, eml230b } from "../test-data/eml-files";

test.use({
  storageState: "e2e-tests/state/admin.json",
});

test.describe("Election creation", () => {
  test("it uploads an election file, candidate list and polling stations", async ({ page }) => {
    await page.goto("/elections");
    const overviewPage = new OverviewPgObj(page);
    await overviewPage.create.click();

    // upload election and check hash
    await uploadElectionAndInputHash(page);

    // upload candidates list and check
    await uploadCandidatesAndInputHash(page);

    // upload polling stations
    await uploadPollingStations(page);

    // Counting method page
    const countingMethodPage = new CountingMethodTypePgObj(page);
    await expect(countingMethodPage.header).toBeVisible();
    await countingMethodPage.next.click();

    // Number of voters page
    const numberOfVotersPage = new NumberOfVotersPgObj(page);
    await expect(numberOfVotersPage.header).toBeVisible();
    await expect(numberOfVotersPage.hint).toBeVisible();
    await numberOfVotersPage.next.click();

    // Now we should be at the check and save page
    const checkAndSavePage = new CheckAndSavePgObj(page);
    await expect(checkAndSavePage.header).toBeVisible();
    await expect(checkAndSavePage.countingMethod).toContainText("Centrale stemopneming");
    await expect(checkAndSavePage.numberOfVoters).toContainText("612.694");

    const responsePromise = page.waitForResponse(`/api/elections/import`);
    await checkAndSavePage.save.click();
    await expect(overviewPage.header).toBeVisible();

    const response = await responsePromise;
    expect(response.status()).toBe(201);
    const election = (await response.json()) as Election;

    const electionRow = overviewPage.findElectionRowById(election.id);
    await expect(electionRow).toBeVisible();
    await expect(electionRow).toContainText("Gemeenteraad Test 2022");
    await expect(electionRow).toContainText("Zitting voorbereiden");
  });

  test("it uploads an election file, candidate list but skips polling stations", async ({ page }) => {
    await page.goto("/elections");
    const overviewPage = new OverviewPgObj(page);
    await overviewPage.create.click();

    // upload election and check hash
    await uploadElectionAndInputHash(page);

    // upload candidates list and check
    await uploadCandidatesAndInputHash(page);

    // skip polling stations
    const uploadPollingStationsPage = new UploadPollingStationDefinitionPgObj(page);
    await expect(uploadPollingStationsPage.header).toBeVisible();
    await uploadPollingStationsPage.skipButton.click();

    // Counting method page
    const countingMethodPage = new CountingMethodTypePgObj(page);
    await expect(countingMethodPage.header).toBeVisible();
    await countingMethodPage.next.click();

    // Number of voters page
    const numberOfVotersPage = new NumberOfVotersPgObj(page);
    await expect(numberOfVotersPage.header).toBeVisible();
    await expect(numberOfVotersPage.hint).toBeHidden();
    await numberOfVotersPage.next.click();

    // Expect error, input a value and try clicking Next again
    await expect(numberOfVotersPage.error).toBeVisible();
    await numberOfVotersPage.input.fill("1234");
    await numberOfVotersPage.next.click();

    // Now we should be at the check and save page
    const checkAndSavePage = new CheckAndSavePgObj(page);
    await expect(checkAndSavePage.header).toBeVisible();

    const responsePromise = page.waitForResponse(`/api/elections/import`);
    await checkAndSavePage.save.click();
    await expect(overviewPage.header).toBeVisible();

    const response = await responsePromise;
    expect(response.status()).toBe(201);
    const election = (await response.json()) as Election;

    const electionRow = overviewPage.findElectionRowById(election.id);
    await expect(electionRow).toBeVisible();
    await expect(electionRow).toContainText("Gemeenteraad Test 2022");
    await expect(electionRow).toContainText("Zitting voorbereiden");
  });

  test("it fails on incorrect hash", async ({ page }) => {
    await page.goto("/elections");
    const overviewPage = new OverviewPgObj(page);
    await overviewPage.create.click();

    // Upload election
    const uploadElectionDefinitionPage = new UploadElectionDefinitionPgObj(page);
    await expect(uploadElectionDefinitionPage.header).toBeVisible();
    await uploadElectionDefinitionPage.uploadFile(page, eml110a.path);

    // Wrong hash
    const checkDefinitionPage = new CheckElectionDefinitionPgObj(page);
    await expect(checkDefinitionPage.hashInput1).toBeFocused();
    await checkDefinitionPage.inputHash("1234", "abcd");
    await expect(checkDefinitionPage.error).toBeVisible();
  });

  test("it fails on valid, but incorrect file", async ({ page }) => {
    await page.goto("/elections");
    const overviewPage = new OverviewPgObj(page);
    await overviewPage.create.click();

    // Incorrect file
    const uploadElectionDefinitionPage = new UploadElectionDefinitionPgObj(page);
    await expect(uploadElectionDefinitionPage.header).toBeVisible();
    await uploadElectionDefinitionPage.uploadFile(page, eml110b.path);
    await expect(uploadElectionDefinitionPage.error).toBeVisible();
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

  test("warning modal close button should stay on page", async ({ page }) => {
    await page.goto("/elections");
    const overviewPage = new OverviewPgObj(page);
    await overviewPage.create.click();

    const uploadElectionDefinitionPage = new UploadElectionDefinitionPgObj(page);
    await expect(uploadElectionDefinitionPage.header).toBeVisible();
    await uploadElectionDefinitionPage.uploadFile(page, eml110a.path);

    const checkDefinitionPage = new CheckElectionDefinitionPgObj(page);
    await expect(checkDefinitionPage.header).toBeVisible();

    // Menu button back to election overview
    const navBar = new AdminNavBar(page);
    await navBar.electionOverviewButton.click();

    // Abort modal should have stopped navigation
    const abortModal = new AbortModalPgObj(page);
    await expect(abortModal.header).toBeVisible();

    // Click close, assert we are still on the election create page
    await abortModal.closeButton.click();
    await expect(checkDefinitionPage.header).toBeVisible();
  });

  test("warning modal cancel button should stay on page", async ({ page }) => {
    await page.goto("/elections");
    const overviewPage = new OverviewPgObj(page);
    await overviewPage.create.click();

    const uploadElectionDefinitionPage = new UploadElectionDefinitionPgObj(page);
    await expect(uploadElectionDefinitionPage.header).toBeVisible();
    await uploadElectionDefinitionPage.uploadFile(page, eml110a.path);

    const checkDefinitionPage = new CheckElectionDefinitionPgObj(page);
    await expect(checkDefinitionPage.header).toBeVisible();

    // Menu button back to election overview
    const navBarPage = new AdminNavBar(page);
    await navBarPage.electionOverviewButton.click();

    // Abort modal should have stopped navigation
    const abortModal = new AbortModalPgObj(page);
    await expect(abortModal.header).toBeVisible();

    // Click cancel, assert we are still on the election create page
    await abortModal.cancelButton.click();
    await expect(checkDefinitionPage.header).toBeVisible();
  });

  test("warning modal delete button should continue navigation", async ({ page }) => {
    await page.goto("/elections");
    const overviewPage = new OverviewPgObj(page);
    await overviewPage.create.click();

    const uploadElectionDefinitionPage = new UploadElectionDefinitionPgObj(page);
    await expect(uploadElectionDefinitionPage.header).toBeVisible();
    await uploadElectionDefinitionPage.uploadFile(page, eml110a.path);

    const checkDefinitionPage = new CheckElectionDefinitionPgObj(page);
    await expect(checkDefinitionPage.header).toBeVisible();

    // Menu button back to election overview
    const navBarPage = new AdminNavBar(page);
    await navBarPage.electionOverviewButton.click();

    // Abort modal should have stopped navigation
    const abortModal = new AbortModalPgObj(page);
    await expect(abortModal.header).toBeVisible();

    // Click delete, assert we are back at the overview
    await abortModal.deleteButton.click();
    await expect(overviewPage.header).toBeVisible();
  });

  test("uploading a candidate list, then navigating should trigger the modal", async ({ page }) => {
    await page.goto("/elections");
    const overviewPage = new OverviewPgObj(page);
    await overviewPage.create.click();

    // upload election and check hash
    await uploadElectionAndInputHash(page);

    // Candidate page
    const uploadCandidateDefinitionPage = new UploadCandidateDefinitionPgObj(page);
    await expect(uploadCandidateDefinitionPage.header).toBeVisible();
    await uploadCandidateDefinitionPage.uploadFile(page, eml230b.path);

    // Menu button back to election overview
    const navBarPage = new AdminNavBar(page);
    await navBarPage.electionOverviewButton.click();

    // Abort modal should have stopped navigation
    const AbortModal = new AbortModalPgObj(page);
    await expect(AbortModal.header).toBeVisible();
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

    // Back button
    await page.goBack();

    const uploadElectionDefinitionPage = new UploadElectionDefinitionPgObj(page);
    await expect(uploadElectionDefinitionPage.header).toBeVisible();
  });

  test("after candidate upload, moving back to candidate page resets candidates", async ({ page }) => {
    await page.goto("/elections");
    const overviewPage = new OverviewPgObj(page);
    await overviewPage.create.click();

    // upload election and check hash
    await uploadElectionAndInputHash(page);

    // upload candidates list and check hash
    await uploadCandidatesAndInputHash(page);

    // Now we should be at the polling station upload page
    const uploadPollingStationDefinitionPage = new UploadPollingStationDefinitionPgObj(page);
    await expect(uploadPollingStationDefinitionPage.header).toBeVisible();

    // Back button
    await page.goBack();

    // We should be back at the candidate page
    const uploadCandidateDefinitionPage = new UploadCandidateDefinitionPgObj(page);
    await expect(uploadCandidateDefinitionPage.header).toBeVisible();
  });

  test("navigating to list-of-candidates should redirect to create", async ({ page }) => {
    await page.goto("/elections/create/list-of-candidates");

    // Upload election
    const uploadElectionDefinitionPage = new UploadElectionDefinitionPgObj(page);
    await expect(uploadElectionDefinitionPage.header).toBeVisible();
  });

  test("navigate to check-and-save should redirect to create", async ({ page }) => {
    await page.goto("/elections/create/check-and-save");

    // Upload election
    const uploadElectionDefinitionPage = new UploadElectionDefinitionPgObj(page);
    await expect(uploadElectionDefinitionPage.header).toBeVisible();
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

    // Now we should be at the polling station upload page
    const uploadPollingStationDefinitionPage = new UploadPollingStationDefinitionPgObj(page);
    await expect(uploadPollingStationDefinitionPage.header).toBeVisible();

    // Now upload a new election
    const uploadElectionDefinitionPage = new UploadElectionDefinitionPgObj(page);
    await page.goto("/elections/create");
    await expect(uploadElectionDefinitionPage.header).toBeVisible();
    await uploadElectionDefinitionPage.uploadFile(page, eml110a.path);

    // Back button
    await page.goBack();
    await expect(uploadElectionDefinitionPage.header).toBeVisible();
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

    // upload polling stations
    await uploadPollingStations(page);

    // Now we should be at the check and save page
    const countingMethodPage = new CountingMethodTypePgObj(page);
    await expect(countingMethodPage.header).toBeVisible();
    await countingMethodPage.next.click();

    // Number of voters page
    const numberOfVotersPage = new NumberOfVotersPgObj(page);
    await expect(numberOfVotersPage.header).toBeVisible();
    await numberOfVotersPage.next.click();

    // Now we should be at the check and save page
    const checkAndSavePage = new CheckAndSavePgObj(page);
    await expect(checkAndSavePage.header).toBeVisible();
    await checkAndSavePage.save.click();

    // Redefine the Overview page, so we can locate the newly
    await expect(overviewPage.header).toBeVisible();

    // Back button
    await page.goBack();

    // We should be at the election upload page, not the check-and-save
    const uploadElectionDefinitionPage = new UploadElectionDefinitionPgObj(page);
    await expect(uploadElectionDefinitionPage.header).toBeVisible();
  });

  test("it fails on valid, but incorrect polling station file", async ({ page }) => {
    await page.goto("/elections");
    const overviewPage = new OverviewPgObj(page);
    await overviewPage.create.click();

    // upload election and check hash
    await uploadElectionAndInputHash(page);

    // upload candidates list and check hash
    await uploadCandidatesAndInputHash(page);

    // upload wrong file
    const uploadElectionDefinitionPage = new UploadPollingStationDefinitionPgObj(page);
    await expect(uploadElectionDefinitionPage.header).toBeVisible();
    await uploadElectionDefinitionPage.uploadFile(page, eml110a.path);
    await expect(uploadElectionDefinitionPage.main).toContainText(eml110a.filename);
    await expect(uploadElectionDefinitionPage.error).toBeVisible();
  });

  test("show more button should show full list of polling stations", async ({ page }) => {
    await page.goto("/elections");
    const overviewPage = new OverviewPgObj(page);
    await overviewPage.create.click();

    // upload election and check hash
    await uploadElectionAndInputHash(page);

    // upload candidates list and check hash
    await uploadCandidatesAndInputHash(page);

    const uploadElectionDefinitionPage = new UploadPollingStationDefinitionPgObj(page);
    await expect(uploadElectionDefinitionPage.header).toBeVisible();
    await uploadElectionDefinitionPage.uploadFile(page, eml110b.path);
    await expect(uploadElectionDefinitionPage.main).toContainText(eml110b.filename);

    // Check list of polling stations
    const checkDefinitionPage = new CheckPollingStationDefinitionPgObj(page);
    await expect(checkDefinitionPage.header).toBeVisible();

    // Check the overview table
    await expect(checkDefinitionPage.table).toBeVisible();
    expect(await checkDefinitionPage.stations.count()).toBe(10);

    // Click button
    await checkDefinitionPage.showMore.click();
    expect(await checkDefinitionPage.stations.count()).toBeGreaterThan(10);
  });

  test("no show more button should be visible is <10 polling stations", async ({ page }) => {
    await page.goto("/elections");
    const overviewPage = new OverviewPgObj(page);
    await overviewPage.create.click();

    // upload election and check hash
    await uploadElectionAndInputHash(page);

    // upload candidates list and check hash
    await uploadCandidatesAndInputHash(page);

    const uploadElectionDefinitionPage = new UploadPollingStationDefinitionPgObj(page);
    await expect(uploadElectionDefinitionPage.header).toBeVisible();
    await uploadElectionDefinitionPage.uploadFile(page, eml110b_short.path);
    await expect(uploadElectionDefinitionPage.main).toContainText(eml110b_short.filename);

    // Check list of polling stations
    const checkDefinitionPage = new CheckPollingStationDefinitionPgObj(page);
    await expect(checkDefinitionPage.header).toBeVisible();

    // Check the overview table
    await expect(checkDefinitionPage.table).toBeVisible();
    expect(await checkDefinitionPage.stations.count()).toBe(9);

    // Click button should not exist
    await expect(checkDefinitionPage.showMore).toBeHidden();
  });
});

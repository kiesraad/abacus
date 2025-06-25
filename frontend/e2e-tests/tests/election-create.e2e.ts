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
    // const initialReadyStateCount = await overviewPage.electionsInReadyState.count();
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
    // TODO: Uncomment this when issue #1649 is finished
    // // Check if the amount of "Klaar voor invoer states" is greater than before the import
    // expect(await overviewPage.electionsInReadyState.count()).toBeGreaterThan(initialReadyStateCount);
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

  test("after election upload, moving back to election page resets election", async ({ page }) => {
    await page.goto("/elections");
    const overviewPage = new OverviewPgObj(page);
    await overviewPage.create.click();

    // Upload election
    const uploadDefinitionPage = new UploadDefinitionPgObj(page);
    await expect(uploadDefinitionPage.header).toBeVisible();
    await uploadDefinitionPage.uploadFile(page, "../backend/src/eml/tests/eml110a_test.eml.xml");

    // Process hash
    const checkDefinitionPage = new CheckDefinitionPgObj(page);
    await expect(checkDefinitionPage.header).toBeVisible();
    await expect(page.getByText("eml110a_test.eml.xml")).toBeVisible();
    await expect(page.getByText("Woensdag 16 maart 2022")).toBeVisible();
    await expect(checkDefinitionPage.hashInput1).toBeFocused();
    await checkDefinitionPage.hashInput1.fill("9825");
    await checkDefinitionPage.hashInput2.fill("8af1");
    await checkDefinitionPage.next.click();

    // Candidate page
    const uploadCandidateDefinitionPage = new UploadCandidateDefinitionPgObj(page);
    await expect(uploadCandidateDefinitionPage.header).toBeVisible();
    await uploadCandidateDefinitionPage.uploadFile(page, "../backend/src/eml/tests/eml230b_test.eml.xml");
    const checkCandidateDefinitionPage = new CheckCandidateDefinitionPgObj(page);
    await expect(checkCandidateDefinitionPage.header).toBeVisible();

    // Back button
    await page.goBack();

    // We should be back at the upload election page
    await expect(uploadDefinitionPage.header).toBeVisible();
  });

  test("after candidate upload, moving back to candidate page resets candidates", async ({ page }) => {
    await page.goto("/elections");
    const overviewPage = new OverviewPgObj(page);
    await overviewPage.create.click();

    // Upload election
    const uploadDefinitionPage = new UploadDefinitionPgObj(page);
    await expect(uploadDefinitionPage.header).toBeVisible();
    await uploadDefinitionPage.uploadFile(page, "../backend/src/eml/tests/eml110a_test.eml.xml");

    // Process hash
    const checkDefinitionPage = new CheckDefinitionPgObj(page);
    await expect(checkDefinitionPage.header).toBeVisible();
    await expect(page.getByText("eml110a_test.eml.xml")).toBeVisible();
    await expect(page.getByText("Woensdag 16 maart 2022")).toBeVisible();
    await expect(checkDefinitionPage.hashInput1).toBeFocused();
    await checkDefinitionPage.hashInput1.fill("9825");
    await checkDefinitionPage.hashInput2.fill("8af1");
    await checkDefinitionPage.next.click();

    // Candidate page
    const uploadCandidateDefinitionPage = new UploadCandidateDefinitionPgObj(page);
    await expect(uploadCandidateDefinitionPage.header).toBeVisible();
    await uploadCandidateDefinitionPage.uploadFile(page, "../backend/src/eml/tests/eml230b_test.eml.xml");

    // Candidate check page
    const checkCandidateDefinitionPage = new CheckCandidateDefinitionPgObj(page);
    await expect(checkCandidateDefinitionPage.header).toBeVisible();
    await expect(page.getByText("eml230b_test.eml.xml")).toBeVisible();
    await expect(page.getByText("Woensdag 16 maart 2022")).toBeVisible();
    await expect(checkCandidateDefinitionPage.hashInput1).toBeFocused();
    await checkCandidateDefinitionPage.hashInput1.fill("8a7b");
    await checkCandidateDefinitionPage.hashInput2.fill("458a");
    await checkCandidateDefinitionPage.next.click();

    // Now we should be at the check and save page
    const checkAndSavePage = new CheckAndSavePgObj(page);
    await expect(checkAndSavePage.header).toBeVisible();

    // Back button
    await page.goBack();

    // We should be back at the candidate page
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

    // Upload election
    const uploadDefinitionPage = new UploadDefinitionPgObj(page);
    await expect(uploadDefinitionPage.header).toBeVisible();
    await uploadDefinitionPage.uploadFile(page, "../backend/src/eml/tests/eml110a_test.eml.xml");

    // Process hash
    const checkDefinitionPage = new CheckDefinitionPgObj(page);
    await expect(checkDefinitionPage.header).toBeVisible();
    await expect(page.getByText("eml110a_test.eml.xml")).toBeVisible();
    await expect(page.getByText("Woensdag 16 maart 2022")).toBeVisible();
    await expect(checkDefinitionPage.hashInput1).toBeFocused();
    await checkDefinitionPage.hashInput1.fill("9825");
    await checkDefinitionPage.hashInput2.fill("8af1");
    await checkDefinitionPage.next.click();

    // Candidate page
    const uploadCandidateDefinitionPage = new UploadCandidateDefinitionPgObj(page);
    await expect(uploadCandidateDefinitionPage.header).toBeVisible();
    await uploadCandidateDefinitionPage.uploadFile(page, "../backend/src/eml/tests/eml230b_test.eml.xml");

    // Candidate check page
    const checkCandidateDefinitionPage = new CheckCandidateDefinitionPgObj(page);
    await expect(checkCandidateDefinitionPage.header).toBeVisible();
    await expect(page.getByText("eml230b_test.eml.xml")).toBeVisible();
    await expect(page.getByText("Woensdag 16 maart 2022")).toBeVisible();
    await expect(checkCandidateDefinitionPage.hashInput1).toBeFocused();
    await checkCandidateDefinitionPage.hashInput1.fill("8a7b");
    await checkCandidateDefinitionPage.hashInput2.fill("458a");
    await checkCandidateDefinitionPage.next.click();

    // Now we should be at the check and save page
    const checkAndSavePage = new CheckAndSavePgObj(page);
    await expect(checkAndSavePage.header).toBeVisible();

    // Now upload a new election
    await page.goto("/elections/create");
    await expect(uploadDefinitionPage.header).toBeVisible();
    await uploadDefinitionPage.uploadFile(page, "../backend/src/eml/tests/eml110a_test.eml.xml");

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

    // Election page
    const uploadDefinitionPage = new UploadDefinitionPgObj(page);
    await expect(uploadDefinitionPage.header).toBeVisible();
    await uploadDefinitionPage.uploadFile(page, "../backend/src/eml/tests/eml110a_test.eml.xml");
    const checkDefinitionPage = new CheckDefinitionPgObj(page);
    await expect(checkDefinitionPage.header).toBeVisible();
    await expect(page.getByText("eml110a_test.eml.xml")).toBeVisible();
    await expect(page.getByText("Woensdag 16 maart 2022")).toBeVisible();
    await expect(checkDefinitionPage.hashInput1).toBeFocused();
    await checkDefinitionPage.hashInput1.fill("9825");
    await checkDefinitionPage.hashInput2.fill("8af1");
    await checkDefinitionPage.next.click();

    // Candidate page
    const uploadCandidateDefinitionPage = new UploadCandidateDefinitionPgObj(page);
    await expect(uploadCandidateDefinitionPage.header).toBeVisible();
    await uploadCandidateDefinitionPage.uploadFile(page, "../backend/src/eml/tests/eml230b_test.eml.xml");
    const checkCandidateDefinitionPage = new CheckCandidateDefinitionPgObj(page);
    await expect(checkCandidateDefinitionPage.header).toBeVisible();
    await expect(page.getByText("eml230b_test.eml.xml")).toBeVisible();
    await expect(page.getByText("Woensdag 16 maart 2022")).toBeVisible();
    await expect(checkCandidateDefinitionPage.hashInput1).toBeFocused();
    await checkCandidateDefinitionPage.hashInput1.fill("8a7b");
    await checkCandidateDefinitionPage.hashInput2.fill("458a");
    await checkCandidateDefinitionPage.next.click();

    // Now we should be at the check and save page
    const checkAndSavePage = new CheckAndSavePgObj(page);
    await expect(checkAndSavePage.header).toBeVisible();
    await checkAndSavePage.save.click();

    // Redefine the Overview page, so we can locate the newly
    await expect(overviewPage.header).toBeVisible();

    // Back button
    await page.goBack();

    // We should be at the election upload page, not the check-and-save
    await expect(uploadDefinitionPage.header).toBeVisible();
  });
});

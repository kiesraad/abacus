import { expect } from "@playwright/test";
import { CheckAndSavePgObj } from "e2e-tests/page-objects/election/create/CheckAndSavePgObj";
import { CheckCandidateDefinitionPgObj } from "e2e-tests/page-objects/election/create/CheckCandidateDefinitionPgObj";
import { CheckDefinitionPgObj } from "e2e-tests/page-objects/election/create/CheckDefinitionPgObj";
import { UploadCandidateDefinitionPgObj } from "e2e-tests/page-objects/election/create/UploadCandidateDefinitionPgObj";
import { UploadDefinitionPgObj } from "e2e-tests/page-objects/election/create/UploadDefinitionPgObj";
import { OverviewPgObj } from "e2e-tests/page-objects/election/OverviewPgObj";

import { test } from "../fixtures";

test.use({
  storageState: "e2e-tests/state/admin.json",
});

test.describe("Election creation", () => {
  test("it uploads an election file and candidate list", async ({ page }) => {
    await page.goto("/elections");
    const overviewPage = new OverviewPgObj(page);
    const initialElectionCount = await overviewPage.electionCount();
    // const initialReadyStateCount = await page.getByText("Klaar voor invoer").count();
    await overviewPage.create.click();

    const uploadDefinitionPage = new UploadDefinitionPgObj(page);
    await expect(uploadDefinitionPage.header).toBeVisible();
    await uploadDefinitionPage.uploadFile(page, "../backend/src/eml/tests/eml110a_test.eml.xml");

    const checkDefinitionPage = new CheckDefinitionPgObj(page);
    await expect(checkDefinitionPage.header).toBeVisible();
    // Check that the uploaded file name is present somewhere on the page
    await expect(page.getByText("eml110a_test.eml.xml")).toBeVisible();
    // Election date
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
    await checkAndSavePage.save.click();

    // Redefine the Overview page, so we can locate the newly
    // added objects
    await expect(overviewPage.header).toBeVisible();
    // Check if the amount of elections by this title is greater than before the import
    expect(await overviewPage.electionCount()).toBeGreaterThan(initialElectionCount);
    // TODO: Uncomment this when issue #1649 is finished
    // // Check if the amount of "Klaar voor invoer states" is greater than before the import
    // expect(await overviewPage.readyStateCount()).toBeGreaterThan(initialReadyStateCount);
  });

  test("it fails on incorrect hash", async ({ page }) => {
    await page.goto("/elections");
    const overviewPage = new OverviewPgObj(page);
    await overviewPage.create.click();

    const uploadDefinitionPage = new UploadDefinitionPgObj(page);
    await expect(uploadDefinitionPage.header).toBeVisible();
    await uploadDefinitionPage.uploadFile(page, "../backend/src/eml/tests/eml110a_test.eml.xml");

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
    await uploadDefinitionPage.uploadFile(page, "../backend/src/eml/tests/eml110b_test.eml.xml");
    await expect(uploadDefinitionPage.error).toBeVisible();
  });

  test("it fails on incorrect hash for candidate list", async ({ page }) => {
    await page.goto("/elections");
    const overviewPage = new OverviewPgObj(page);
    await overviewPage.create.click();

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

    // Candidate check page
    const checkCandidateDefinitionPage = new CheckCandidateDefinitionPgObj(page);
    await expect(checkCandidateDefinitionPage.header).toBeVisible();
    await expect(page.getByText("eml230b_test.eml.xml")).toBeVisible();
    await expect(page.getByText("Woensdag 16 maart 2022")).toBeVisible();
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
    await uploadCandidateDefinitionPage.uploadFile(page, "../backend/src/eml/tests/eml110b_test.eml.xml");
    await expect(uploadCandidateDefinitionPage.error).toBeVisible();
  });
});

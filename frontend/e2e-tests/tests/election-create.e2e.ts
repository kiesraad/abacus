import { expect } from "@playwright/test";
import { CheckAndSavePgObj } from "e2e-tests/page-objects/election/create/CheckAndSavePgObj";
import { CheckDefinitionPgObj } from "e2e-tests/page-objects/election/create/CheckDefinitionPgObj";
import { UploadDefinitionPgObj } from "e2e-tests/page-objects/election/create/UploadDefinitionPgObj";
import { OverviewPgObj } from "e2e-tests/page-objects/election/OverviewPgObj";

import { test } from "../fixtures";

test.use({
  storageState: "e2e-tests/state/admin.json",
});

test.describe("Election creation", () => {
  test("it uploads a file", async ({ page }) => {
    await page.goto("/elections");
    const overviewPage = new OverviewPgObj(page);
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

    const checkAndSavePage = new CheckAndSavePgObj(page);
    await expect(checkAndSavePage.header).toBeVisible();
    await checkAndSavePage.save.click();

    //await page.goto("/elections");

    // Redefine the Overview page, so we can locate the newly
    // added objects
    await expect(overviewPage.header).toBeVisible();
    await expect(page.getByText("Gemeenteraad Amsterdam 2022")).toBeVisible();
    await expect(page.getByText("Klaar voor invoer")).toBeVisible();
  });
});

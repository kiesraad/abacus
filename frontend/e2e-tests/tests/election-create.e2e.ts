import { expect } from "@playwright/test";
import { ElectionCheckDefinitionPgObj } from "e2e-tests/page-objects/election/ElectionCheckDefinitionPgObj";
import { ElectionUploadDefinitionPgObj } from "e2e-tests/page-objects/election/ElectionUploadDefinitionPgObj";
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

    const uploadDefinitionPage = new ElectionUploadDefinitionPgObj(page);
    await expect(uploadDefinitionPage.header).toBeVisible();
    await uploadDefinitionPage.uploadFile(page, "../backend/src/eml/tests/eml110a_test.eml.xml");

    const checkDefinitionPage = new ElectionCheckDefinitionPgObj(page);
    await expect(checkDefinitionPage.header).toBeVisible();
    // Check that the uploaded file name is present somewhere on the page
    await expect(page.getByText("eml110a_test.eml.xml")).toBeVisible();
    // Election date
    await expect(page.getByText("Woensdag 16 Maart 2022")).toBeVisible();
  });
});

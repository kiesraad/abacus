import { expect } from "@playwright/test";
import { PollingStationImportPgObj } from "e2e-tests/page-objects/polling_station/PollingStationImportPgObj";
import { PollingStationListEmptyPgObj } from "e2e-tests/page-objects/polling_station/PollingStationListEmptyPgObj";

import { test } from "../fixtures";
import { PollingStationListPgObj } from "../page-objects/polling_station/PollingStationListPgObj";
import { eml110a, eml110b } from "../test-data/eml-files";

test.use({
  storageState: "e2e-tests/state/coordinator1.json",
});

test.describe("Polling station import", () => {
  test("As coordinator import polling stations from a file", async ({ page, emptyElection }) => {
    await page.goto(`/elections/${emptyElection.id}/polling-stations`);

    // Click file import button
    const emptyListPage = new PollingStationListEmptyPgObj(page);
    await emptyListPage.importButton.click();

    // On the import page
    const importPage = new PollingStationImportPgObj(page);
    await expect(importPage.header).toBeVisible();

    // Select incorrect file
    await importPage.uploadFile(eml110a.path);
    await expect(importPage.invalidFileAlert).toContainText("Ongeldig stembureaubestand");

    // Select correct file
    await importPage.uploadFile(eml110b.path);
    await importPage.importButton.click();

    // Check for confirmation on the list page
    const listPage = new PollingStationListPgObj(page);
    await expect(listPage.header).toBeVisible();
    await expect(listPage.alert).toContainText(/Er zijn \d+ stembureaus geïmporteerd/);
  });

  test("As coordinator import a polling stations definition that's too large", async ({
    page,
    emptyElection,
    eml110bTooLargeTestFile,
  }) => {
    await page.goto(`/elections/${emptyElection.id}/polling-stations`);

    // Click file import button
    const emptyListPage = new PollingStationListEmptyPgObj(page);
    await emptyListPage.importButton.click();

    // On the import page
    const importPage = new PollingStationImportPgObj(page);
    await expect(importPage.header).toBeVisible();

    // Select file that's too large
    await importPage.uploadFile(eml110bTooLargeTestFile.path);
    await expect(importPage.invalidFileAlert).toBeVisible();
    await expect(importPage.invalidFileAlert).toContainText(
      `Het bestand ${eml110bTooLargeTestFile.filename} is te groot. Kies een bestand van maximaal 5 Megabyte.`,
    );
  });
});

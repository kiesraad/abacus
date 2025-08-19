import { expect } from "@playwright/test";
import { PollingStationImportPgObj } from "e2e-tests/page-objects/polling_station/PollingStationImportPgObj";
import { PollingStationListEmptyPgObj } from "e2e-tests/page-objects/polling_station/PollingStationListEmptyPgObj";

import { test } from "../fixtures";
import { eml110b } from "../test-data/eml-files";

test.use({
  storageState: "e2e-tests/state/coordinator.json",
});

test.describe("Polling station import", () => {
  test("As coordinator import polling stations from a file", async ({ page, emptyElection }) => {
    await page.goto(`/elections/${emptyElection.id}/polling-stations`);

    // Click file import button
    const listPage = new PollingStationListEmptyPgObj(page);
    await listPage.importButton.click();

    // On the import page
    const importPage = new PollingStationImportPgObj(page);
    await expect(importPage.header).toBeVisible();

    // Select correct file
    await importPage.uploadFile(page, eml110b.path);
    await importPage.importButton.click();

    // Check for confirmation
    await expect(page.getByRole("strong").filter({ hasText: /Er zijn \d+ stembureaus opgeslagen/ })).toBeVisible();
  });
});

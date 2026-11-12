import { stat } from "node:fs/promises";
import { expect } from "@playwright/test";
import { PollingStationListPgObj } from "e2e-tests/page-objects/polling_station/PollingStationListPgObj";
import { test } from "../../fixtures";

test.use({
  storageState: "e2e-tests/state/coordinator1-GSB.json",
});

test.describe("Polling station export", () => {
  test("As coordinator export polling station list as a zipped EML file", async ({ page, electionGSB }) => {
    await page.goto(`/elections/${electionGSB.election.id}/polling-stations`);

    const listPage = new PollingStationListPgObj(page);

    const responsePromise = page.waitForResponse(`/api/elections/${electionGSB.election.id}/polling_stations/export`);
    const downloadPromise = page.waitForEvent("download");

    await listPage.exportPollingStations.click();

    const response = await responsePromise;
    expect(response.status()).toBe(200);
    expect(await response.headerValue("content-type")).toBe("application/zip");

    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(
      /abacus-exporteren_stemgebieden-gemeenteraad_test_2022-eml_110b_stembureaus-\d{8}-\d{6}\.zip/,
    );
    expect((await stat(await download.path())).size).toBeGreaterThan(0);
  });
});

import { expect } from "@playwright/test";
import { ElectionReport } from "e2e-tests/page-objects/status/ElectionReportPgObj";
import { ElectionStatus } from "e2e-tests/page-objects/status/ElectionStatusPgObj";
import { stat } from "node:fs/promises";

import { test } from "./fixtures";

test.describe("election results zip", () => {
  test("it downloads a zip", async ({ page, completedElection }) => {
    await page.goto(`/elections/${completedElection.id}/status#coordinator`);

    const electionStatusPage = new ElectionStatus(page);
    await electionStatusPage.finish.click();

    const electionReportPage = new ElectionReport(page);
    const responsePromise = page.waitForResponse(`/api/elections/${completedElection.id}/download_zip_results`);
    const downloadPromise = page.waitForEvent("download");
    await electionReportPage.downloadZip.click();

    const response = await responsePromise;
    expect(response.status()).toBe(200);
    expect(await response.headerValue("content-type")).toBe("application/zip");

    const download = await downloadPromise;

    expect(download.suggestedFilename()).toBe("election_result_GR2026_Test_Location.zip");
    expect((await stat(await download.path())).size).toBeGreaterThan(1024);
  });
});

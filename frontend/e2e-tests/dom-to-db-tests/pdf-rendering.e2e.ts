import { expect } from "@playwright/test";
import { ElectionReport } from "e2e-tests/page-objects/status/ElectionReportPgObj";
import { ElectionStatus } from "e2e-tests/page-objects/status/ElectionStatusPgObj";
import { stat } from "node:fs/promises";

import { test } from "./fixtures";

test.describe("pdf rendering", () => {
  test("it downloads a pdf", async ({ page, completedElection }) => {
    await page.goto(`/elections/${completedElection.id}/status#coordinator`);

    const electionStatusPage = new ElectionStatus(page);
    await electionStatusPage.finish.click();

    const electionReportPage = new ElectionReport(page);
    const responsePromise = page.waitForResponse(`/api/elections/${completedElection.id}/download_pdf_results`);
    const downloadPromise = page.waitForEvent("download");
    await electionReportPage.downloadPdf.click();

    const response = await responsePromise;
    expect(response.status()).toBe(200);
    expect(await response.headerValue("content-type")).toBe("application/pdf");

    const download = await downloadPromise;

    expect(download.suggestedFilename()).toBe("Model_Na31-2_GR2026_Test_Location.pdf");
    expect((await stat(await download.path())).size).toBeGreaterThan(1024);
  });
});

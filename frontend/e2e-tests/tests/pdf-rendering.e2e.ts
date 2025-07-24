import { expect } from "@playwright/test";
import { ElectionReport } from "e2e-tests/page-objects/election/ElectionReportPgObj";
import { ElectionStatus } from "e2e-tests/page-objects/election/ElectionStatusPgObj";
import { FinishDataEntry } from "e2e-tests/page-objects/election/FinishDataEntryPgObj";
import { stat } from "node:fs/promises";

import { test } from "../fixtures";

test.use({
  storageState: "e2e-tests/state/coordinator.json",
});

test.describe("pdf rendering", () => {
  test("it downloads a pdf", async ({ page, completedElection }) => {
    await page.goto(`/elections/${completedElection.id}/status`);

    const electionStatusPage = new ElectionStatus(page);
    await electionStatusPage.finish.click();

    const finishDataEntryPage = new FinishDataEntry(page);
    await finishDataEntryPage.finishDataEntry.click();

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

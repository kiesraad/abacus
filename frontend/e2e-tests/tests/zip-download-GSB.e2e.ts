import { stat } from "node:fs/promises";
import { expect } from "@playwright/test";
import { ElectionReport } from "e2e-tests/page-objects/election/ElectionReportPgObj";
import { ElectionStatus } from "e2e-tests/page-objects/election/ElectionStatusPgObj";
import { FinishDataEntry } from "e2e-tests/page-objects/election/FinishDataEntryPgObj";
import { test } from "../fixtures";

test.use({
  storageState: "e2e-tests/state/coordinator1-GSB.json",
});

test.describe("GSB election results zip", () => {
  test("it downloads the GSB election results zip", async ({
    page,
    completedElectionGSB,
    currentCommitteeSessionElectionGSB,
  }) => {
    await page.goto(`/elections/${completedElectionGSB.id}/status`);

    const electionStatusPage = new ElectionStatus(page);
    await electionStatusPage.finish.click();

    const finishDataEntryPage = new FinishDataEntry(page);
    await finishDataEntryPage.finishDataEntry.click();

    const electionReportPage = new ElectionReport(page);
    const responsePromise = page.waitForResponse(
      `/api/elections/${completedElectionGSB.id}/committee_sessions/${currentCommitteeSessionElectionGSB.id}/download_zip_results`,
    );
    const downloadPromise = page.waitForEvent("download");
    await electionReportPage.downloadFirstSessionZip.click();

    const response = await responsePromise;
    expect(response.status()).toBe(200);
    expect(await response.headerValue("content-type")).toBe("application/zip");

    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/definitieve-documenten_gr2022_test_gemeente_test-\d{8}-\d{6}.zip/);
    expect((await stat(await download.path())).size).toBeGreaterThan(1024);
  });
});

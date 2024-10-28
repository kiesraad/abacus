import { expect } from "@playwright/test";
import { ElectionReport } from "e2e-tests/page-objects/status/ElectionReportPgObj";
import { ElectionStatus } from "e2e-tests/page-objects/status/ElectionStatusPgObj";
import { stat } from "node:fs/promises";

import { test } from "./fixtures";

test.describe("pdf rendering", () => {
  test("it renders a pdf", async ({ page }) => {
    await page.goto("/elections/4/status#coordinator");

    const electionStatusPage = new ElectionStatus(page);
    await electionStatusPage.finish.click();

    const electionReportPage = new ElectionReport(page);
    const downloadPromise = page.waitForEvent("download");
    await electionReportPage.download.click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toBe("model-na-31-2.pdf");
    expect((await stat(await download.path())).size).toBeGreaterThan(1024);
  });
});

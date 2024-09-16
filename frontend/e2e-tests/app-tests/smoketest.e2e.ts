import { expect, test } from "@playwright/test";
import { RecountedPage } from "e2e-tests/page-objects/data_entry/RecountedPgObj";

test("smoke test", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const appFrame = page.locator("css=#root .app-frame");
  await expect(appFrame).toContainText("Abacus");
});

test("data entry form", async ({ page }) => {
  await page.goto("/elections/1/data-entry/1/recounted", { waitUntil: "domcontentloaded" });
  const recountedPage = new RecountedPage(page);
  await expect(recountedPage.no).toBeVisible();
});

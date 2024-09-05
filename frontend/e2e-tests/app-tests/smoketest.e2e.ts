import { expect, test } from "@playwright/test";
import { RecountedPage } from "e2e-tests/page-objects/input/RecountedPgObj";

test("smoke test", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const appFrame = page.locator("css=#root .app-frame");
  await expect(appFrame).toContainText("Abacus");
});

test("input form", async ({ page }) => {
  await page.goto("/1/input/1/recounted", { waitUntil: "domcontentloaded" });
  const recountedPage = new RecountedPage(page);
  await expect(recountedPage.no).toBeVisible();
});

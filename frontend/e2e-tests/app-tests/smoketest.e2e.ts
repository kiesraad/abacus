import { expect, test } from "@playwright/test";
import { VotersVotesPage } from "e2e-tests/page-objects/input/VotersVotesPage";

test("smoke test", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const appFrame = page.locator("css=#root .app-frame");
  await expect(appFrame).toContainText("Abacus");
});

test("input form", async ({ page }) => {
  await page.goto("/1/input/1/numbers", { waitUntil: "domcontentloaded" });
  const votersVotesPage = new VotersVotesPage(page);
  await expect(votersVotesPage.pollCardCount).toBeVisible();
});

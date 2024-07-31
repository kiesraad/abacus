import { expect, test } from "@playwright/test";

test("smoke test", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const appFrame = page.locator("css=#root .app-frame");
  await expect(appFrame).toContainText("Abacus");
});

test("input form", async ({ page }) => {
  await page.goto("/1/input/1/numbers", { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("poll_card_count")).toBeVisible();
});

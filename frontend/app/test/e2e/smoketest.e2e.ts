import { expect, test } from "@playwright/test";

test("smoke test", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const appFrame = page.locator("css=#root .app-frame");
  await expect(appFrame).toContainText("Abacus");
});

test("input form", async ({ page }) => {
  await page.goto("/input/030", { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("pollCards")).toBeVisible();
});

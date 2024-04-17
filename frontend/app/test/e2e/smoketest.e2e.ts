import { test, expect } from "@playwright/test";

test("smoke test", async ({ page }) => {
  await page.goto("/");
  const appFrame = page.locator("css=#root .app-frame");
  await expect(appFrame).toContainText("Kiesraad uitslag app work in progress");
});

test("input form", async ({ page }) => {
  await page.goto("/input/030");
  await expect(page.getByTestId("pollCards")).toBeVisible();
});

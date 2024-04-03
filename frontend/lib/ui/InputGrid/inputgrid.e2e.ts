import { test, expect } from "@playwright/test";

test("does grid things", async ({ page }) => {
  await page.goto("http://localhost:61000/?story=inputgrid--default-grid");

  const main = page.locator("main.ladle-main");
  const grid = main.locator("table");

  await expect(grid).toBeVisible();
});

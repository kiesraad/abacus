import { test, expect } from "@playwright/test";

test("does button things", async ({ page }) => {
  await page.goto("http://localhost:61000/?story=button--default-button");

  const main = page.locator("main.ladle-main");
  const button = main.locator("button");

  await expect(button).toBeVisible();
});

import { expect, test } from "@playwright/test";

test("not found test", async ({ page }) => {
  const nonExistingUrl = "/-1/input";
  await page.goto(nonExistingUrl, { waitUntil: "domcontentloaded" });
  const appFrame = page.locator("css=#root .app-frame");

  // Test if the error message is rendered
  await expect(appFrame).toContainText(
    "Er ging iet mis. De link die je hebt gebruikt is niet (meer) geldig.",
  );

  // Test if the URL is unchanged
  expect(page.url().endsWith(nonExistingUrl)).toBeTruthy();
});

import { expect, test } from "@playwright/test";

test("all badges are visible", async ({ page }) => {
  await page.goto("http://localhost:61000/?story=badge--all-badges");

  const firstEntryBadge = page.getByText("1e invoer");
  const definitiveBadge = page.getByText("Definitief");
  await expect(firstEntryBadge).toBeVisible();
  await expect(definitiveBadge).toBeVisible();
});

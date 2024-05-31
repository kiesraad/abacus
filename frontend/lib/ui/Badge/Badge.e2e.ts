import { test, expect } from "@playwright/test";

test("all badges are visible", async ({ page }) => {
  await page.goto("http://localhost:61000/?story=badge--all-badges");

  const correctionBadge = page.getByText("Corrigendum");
  const definitiveBadge = page.getByText("Definitief");
  const differenceBadge = page.getByText("Verschil invoer 1 en 2");
  const extraEntryBadge = page.getByText("Extra invoer");
  const firstEntryBadge = page.getByText("1e invoer");
  const objectionsBadge = page.getByText("Bezwaren");
  const secondEntryBadge = page.getByText("2e invoer");

  await expect(correctionBadge).toBeVisible();
  await expect(definitiveBadge).toBeVisible();
  await expect(differenceBadge).toBeVisible();
  await expect(extraEntryBadge).toBeVisible();
  await expect(firstEntryBadge).toBeVisible();
  await expect(objectionsBadge).toBeVisible();
  await expect(secondEntryBadge).toBeVisible();
});

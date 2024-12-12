import { expect, test } from "@playwright/test";

test("badges are visible", async ({ page }) => {
  await page.goto("http://localhost:61000/?story=badge--all-badges");

  const notStartedBadge = page.getByText("1e invoer").filter({ hasNot: page.getByRole("img") });
  await expect(notStartedBadge).toBeVisible();

  const firstEntryInProgressBadge = page
    .getByText("1e invoer")
    .filter({ has: page.getByRole("img") })
    .nth(0);
  await expect(firstEntryInProgressBadge).toBeVisible();

  const firstEntryUnfinishedBadge = page
    .getByText("1e invoer")
    .filter({ has: page.getByRole("img") })
    .nth(1);
  await expect(firstEntryUnfinishedBadge).toBeVisible();

  const secondEntryBadge = page.getByText("2e invoer").filter({ hasNot: page.getByRole("img") });
  await expect(secondEntryBadge).toBeVisible();

  const secondEntryInProgressBadge = page
    .getByText("2e invoer")
    .filter({ has: page.getByRole("img") })
    .nth(0);
  await expect(secondEntryInProgressBadge).toBeVisible();

  const secondEntryUnfinishedBadge = page
    .getByText("2e invoer")
    .filter({ has: page.getByRole("img") })
    .nth(1);
  await expect(secondEntryUnfinishedBadge).toBeVisible();

  const firstSecondEntryDifferentBadge = page
    .getByText("Verschil invoer 1 en 2")
    .filter({ hasNot: page.getByRole("img") });
  await expect(firstSecondEntryDifferentBadge).toBeVisible();

  const definitiveBadge = page.getByText("Definitief").filter({ hasNot: page.getByRole("img") });
  await expect(definitiveBadge).toBeVisible();
});

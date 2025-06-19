import { expect, test } from "@playwright/test";

test("badges are visible", async ({ page }) => {
  await page.goto("/?story=badge--all-badges");
  await page.waitForSelector("[data-storyloaded]");

  const notStartedBadge = page.getByTestId("first_entry_not_started");
  await expect(notStartedBadge).toBeVisible();
  await expect(notStartedBadge).toContainText("1e invoer");
  await expect(notStartedBadge.getByRole("img")).toBeHidden();

  const firstEntryInProgressBadge = page.getByTestId("first_entry_in_progress");
  await expect(firstEntryInProgressBadge).toBeVisible();
  await expect(firstEntryInProgressBadge).toContainText("1e invoer");
  await expect(firstEntryInProgressBadge.getByRole("img")).toHaveAttribute("data-icon", "IconPencil");

  const secondEntryBadge = page.getByTestId("second_entry_not_started");
  await expect(secondEntryBadge).toBeVisible();
  await expect(secondEntryBadge).toContainText("2e invoer");
  await expect(secondEntryBadge.getByRole("img")).toBeHidden();

  const secondEntryInProgressBadge = page.getByTestId("second_entry_in_progress");
  await expect(secondEntryInProgressBadge).toBeVisible();
  await expect(secondEntryInProgressBadge).toContainText("2e invoer");
  await expect(secondEntryInProgressBadge.getByRole("img")).toHaveAttribute("data-icon", "IconPencil");

  const entriesDifferentBadge = page.getByTestId("entries_different");
  await expect(entriesDifferentBadge).toBeVisible();
  await expect(entriesDifferentBadge).toContainText("2e invoer");
  await expect(entriesDifferentBadge.getByRole("img")).toBeHidden();

  const definitiveBadge = page.getByTestId("definitive");
  await expect(definitiveBadge).toBeVisible();
  await expect(definitiveBadge).toContainText("Definitief");
  await expect(definitiveBadge.getByRole("img")).toBeHidden();
});

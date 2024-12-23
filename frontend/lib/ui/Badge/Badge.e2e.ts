import { expect, test } from "@playwright/test";

test("badges are visible", async ({ page }) => {
  await page.goto("http://localhost:61000/?story=badge--all-badges");

  const notStartedBadge = page.getByTestId("not_started");
  await expect(notStartedBadge).toBeVisible();
  await expect(notStartedBadge).toContainText("1e invoer");
  await expect(notStartedBadge.getByRole("img")).toBeHidden();

  const firstEntryInProgressBadge = page.getByTestId("first_entry_in_progress");
  await expect(firstEntryInProgressBadge).toBeVisible();
  await expect(firstEntryInProgressBadge).toContainText("1e invoer");
  await expect(firstEntryInProgressBadge.getByRole("img")).toHaveAttribute("data-icon", "IconPencil");

  const firstEntryUnfinishedBadge = page.getByTestId("first_entry_unfinished");
  await expect(firstEntryUnfinishedBadge).toBeVisible();
  await expect(firstEntryUnfinishedBadge).toContainText("1e invoer");
  await expect(firstEntryUnfinishedBadge.getByRole("img")).toHaveAttribute("data-icon", "IconPencil");

  const secondEntryBadge = page.getByTestId("second_entry");
  await expect(secondEntryBadge).toBeVisible();
  await expect(secondEntryBadge).toContainText("2e invoer");
  await expect(secondEntryBadge.getByRole("img")).toBeHidden();

  const secondEntryInProgressBadge = page.getByTestId("second_entry_in_progress");
  await expect(secondEntryInProgressBadge).toBeVisible();
  await expect(secondEntryInProgressBadge).toContainText("2e invoer");
  await expect(secondEntryInProgressBadge.getByRole("img")).toHaveAttribute("data-icon", "IconPencil");

  const secondEntryUnfinishedBadge = page.getByTestId("second_entry_unfinished");
  await expect(secondEntryUnfinishedBadge).toBeVisible();
  await expect(secondEntryUnfinishedBadge).toContainText("2e invoer");
  await expect(secondEntryUnfinishedBadge.getByRole("img")).toHaveAttribute("data-icon", "IconPencil");

  const firstSecondEntryDifferentBadge = page.getByTestId("first_second_entry_different");
  await expect(firstSecondEntryDifferentBadge).toBeVisible();
  await expect(firstSecondEntryDifferentBadge).toContainText("Verschil invoer 1 en 2");
  await expect(firstSecondEntryDifferentBadge.getByRole("img")).toBeHidden();

  const definitiveBadge = page.getByTestId("definitive");
  await expect(definitiveBadge).toBeVisible();
  await expect(definitiveBadge).toContainText("Definitief");
  await expect(definitiveBadge.getByRole("img")).toBeHidden();
});

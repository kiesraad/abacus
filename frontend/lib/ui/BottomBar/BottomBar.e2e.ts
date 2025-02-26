import { expect, test } from "@playwright/test";

test("bottom bar with button and button hint is visible", async ({ page }) => {
  await page.goto("/?story=bottom-bar--bottom-bar-form");
  await page.waitForSelector("[data-storyloaded]");

  const buttonElement = page.getByRole("button", { name: "Click me" });
  const shiftElement = page.getByText("Shift");
  const enterElement = page.getByText("Enter");

  await expect(buttonElement).toBeVisible();
  await expect(buttonElement).toBeEnabled();
  await expect(shiftElement).toBeVisible();
  await expect(enterElement).toBeVisible();
});

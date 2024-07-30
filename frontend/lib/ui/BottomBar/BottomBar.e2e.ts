import { expect, test } from "@playwright/test";

test("bottom bar is visible", async ({ page }) => {
  await page.goto("http://localhost:61000/?story=bottom-bar--default-bottom-bar");

  const button = page.getByRole("button", {
    name: "Click me",
  });

  await expect(button).toBeVisible();
  await expect(button).toBeEnabled();
});

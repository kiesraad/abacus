import { test, expect } from "@playwright/test";

test("default button is visible", async ({ page }) => {
  await page.goto("http://localhost:61000/?story=button--default-button");

  const button = page.getByRole("button", {
    name: "Invoer",
  });

  await expect(button).toBeVisible();
  await expect(button).toBeEnabled();
});

test("click enabled button", async ({ page }) => {
  await page.goto("http://localhost:61000/?story=button--enabled-button");

  const button = page.getByRole("button", {
    name: "enabled-button",
  });

  await expect(button).toBeEnabled();
  await button.click();
});

test("click disabled button", async ({ page }) => {
  await page.goto("http://localhost:61000/?story=button--disabled-button");

  const button = page.getByRole("button", {
    name: "disabled-button",
  });

  await expect(button).toBeDisabled();
});

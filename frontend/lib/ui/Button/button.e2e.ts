import { test, expect } from "@playwright/test";

test("default button is visible", async ({ page }) => {
  await page.goto("http://localhost:61000/?story=button--default-button");

  const button = page.getByRole('button', {
    name: 'Click me',
  })

  await expect(button).toBeVisible();
  expect(await button.isEnabled()).toBe(true);
});

test("click enabled button", async ({ page }) => {
  await page.goto("http://localhost:61000/?story=button--enabled-button");

  const button = page.getByRole('button', {
    name: 'enabled-button',
  })

  expect(await button.isEnabled()).toBe(true);
  await button.click();
});

test("click disabled button", async ({ page }) => {
  await page.goto("http://localhost:61000/?story=button--disabled-button");

  const button = page.getByRole('button', {
    name: 'disabled-button',
  })

  expect(await button.isDisabled()).toBe(true);
});

import { test, expect } from "@playwright/test";

test("default small wide input field is visible", async ({ page }) => {
  await page.goto("http://localhost:61000/?story=input-field--wide-input-field");

  const input = page.getByRole("textbox", { name: "Default Small Wide" });

  await expect(page.getByText("Default Small Wide with subtext", { exact: true })).toBeVisible();
  await expect(input).toBeVisible();
  await expect(page.getByText("Default Small Wide hint", { exact: true })).toBeVisible();
});

test("error large wide input field is visible", async ({ page }) => {
  await page.goto("http://localhost:61000/?story=input-field--wide-input-field");

  const input = page.getByRole("textbox", { name: "Error Large Wide" });

  await expect(page.getByText("Error Large Wide", { exact: true })).toBeVisible();
  await expect(input).toBeVisible();
  await expect(page.getByText("Error Large Wide hint", { exact: true })).toBeHidden();
  await expect(page.getByText("There is an error", { exact: true })).toBeVisible();
});

test("default medium narrow input field is visible", async ({ page }) => {
  await page.goto("http://localhost:61000/?story=input-field--narrow-input-field");

  const input = page.getByRole("textbox", { name: "Default Medium Narrow" });

  await expect(page.getByText("Default Medium Narrow with subtext", { exact: true })).toBeVisible();
  await expect(input).toBeVisible();
  await expect(page.getByText("Default Medium Narrow hint", { exact: true })).toBeVisible();
});

test("error large narrow input field is visible", async ({ page }) => {
  await page.goto("http://localhost:61000/?story=input-field--narrow-input-field");

  const input = page.getByRole("textbox", { name: "Error Large Narrow" });

  await expect(page.getByText("Error Large Narrow", { exact: true })).toBeVisible();
  await expect(input).toBeVisible();
  await expect(page.getByText("Error Large Narrow hint", { exact: true })).toBeHidden();
  await expect(page.getByText("There is an error", { exact: true })).toBeVisible();
});

test("default text area input field is visible", async ({ page }) => {
  await page.goto("http://localhost:61000/?story=input-field--text-area-input-field");

  const input = page.getByRole("textbox", { name: "Default Text Area" });

  await expect(page.getByText("Default Text Area with subtext", { exact: true })).toBeVisible();
  await expect(input).toBeVisible();
  await expect(page.getByText("Default Text Area hint", { exact: true })).toBeVisible();
});

test("error text area input field is visible", async ({ page }) => {
  await page.goto("http://localhost:61000/?story=input-field--text-area-input-field");

  const input = page.getByRole("textbox", { name: "Error Text Area" });

  await expect(page.getByText("Error Text Area", { exact: true })).toBeVisible();
  await expect(input).toBeVisible();
  await expect(page.getByText("Error Text Area hint", { exact: true })).toBeHidden();
  await expect(page.getByText("There is an error", { exact: true })).toBeVisible();
});

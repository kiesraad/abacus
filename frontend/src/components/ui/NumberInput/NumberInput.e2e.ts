import { expect, test } from "@playwright/test";

test.describe("NumberInput", () => {
  test("number formatting", async ({ page }) => {
    await page.goto("/?story=number-input--default-number-input");
    await page.waitForSelector("[data-storyloaded]");

    const input = page.getByTestId("test");
    await expect(input).toBeVisible();
    await expect(input).toHaveValue("12.300");

    await input.focus();
    await expect(input).toHaveValue("12300");

    await input.blur();
    await expect(input).toHaveValue("12.300");

    // BUG: Playwright with Chrome will append the new value instead of replacing the old value
    // without `clear()` or `selectText()` or `focus()`
    await input.clear();

    await input.fill("9999");
    await expect(input).toHaveValue("9999");

    await input.blur();
    await expect(input).toHaveValue("9.999");
  });
});

import { expect, test } from "@playwright/test";

test("buttons are visible and enabled", async ({ page }) => {
  await page.goto("/?story=button--buttons");
  await page.waitForSelector("[data-storyloaded]");

  const buttons = await page
    .getByRole("button", {
      name: "Invoer",
    })
    .all();

  for (const button of buttons) {
    await expect(button).toBeVisible();
    await expect(button).toBeEnabled();
    await button.click();
    await expect(button).toHaveAttribute("data-has-been-clicked");
  }
});

test("click disabled button does nothing", async ({ page }) => {
  await page.goto("/?story=button--buttons&arg-disabled=true");
  await page.waitForSelector("[data-storyloaded]");

  const buttons = await page
    .getByRole("button", {
      name: "Invoer",
    })
    .all();

  for (const button of buttons) {
    await expect(button).toBeVisible();
    await expect(button).toBeDisabled();
    // eslint-disable-next-line playwright/no-force-option
    await button.click({ force: true });
    await expect(button).not.toHaveAttribute("data-has-been-clicked");
  }
});

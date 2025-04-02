import { test as base, expect, Locator } from "@playwright/test";

const test = base.extend<{ modal: Locator }>({
  modal: async ({ page }, use) => {
    await page.goto("/?story=modal--default-modal");
    await page.waitForSelector("[data-storyloaded]");

    const main = page.locator("main.ladle-main");
    const modal = main.getByRole("dialog");
    await modal.waitFor();

    await use(modal);
  },
});

test.describe("Modal", () => {
  test("closes on clicking X button", async ({ modal }) => {
    await expect(modal).toBeVisible();
    await expect(modal.getByRole("heading", { level: 2 })).toBeFocused();
    await modal.getByRole("button", { name: "Annuleren" }).click();
    await expect(modal).toBeHidden();
  });

  test("closes on Escape key press", async ({ page, modal }) => {
    await expect(modal).toBeVisible();
    await expect(modal.getByRole("heading", { level: 2 })).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(modal).toBeHidden();
  });
});

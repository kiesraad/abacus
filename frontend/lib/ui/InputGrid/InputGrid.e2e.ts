import { test as base, expect, Locator } from "@playwright/test";

const test = base.extend<{ gridPage: Locator }>({
  gridPage: async ({ page }, use) => {
    await page.goto("http://localhost:61000/?story=input-grid--default-grid");
    const main = page.locator("main.ladle-main");
    const grid = main.locator("table");
    await grid.waitFor();

    // eslint-disable-next-line react-hooks/rules-of-hooks
    await use(grid);
  },
});

test.describe("InputGrid", () => {
  test("is visible", async ({ gridPage }) => {
    await expect(gridPage).toBeVisible();
  });
});

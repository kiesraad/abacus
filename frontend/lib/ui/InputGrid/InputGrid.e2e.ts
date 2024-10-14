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

  test("Row has focused class when input has focus", async ({ gridPage, page }) => {
    const firstTR = gridPage.locator("tr").filter({ has: page.getByTestId("input1") });
    const firstInput = gridPage.getByTestId("input1");

    const secondTR = gridPage.locator("tr").filter({ has: page.getByTestId("input2") });
    const secondInput = gridPage.getByTestId("input2");

    await firstInput.focus();
    await expect(firstTR).toHaveClass("focused");
    await expect(secondTR).not.toHaveClass("focused");

    await secondInput.focus();
    await expect(firstTR).not.toHaveClass("focused");
    await expect(secondTR).toHaveClass("focused");
  });
});

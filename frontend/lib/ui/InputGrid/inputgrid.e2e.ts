import { Locator, test as base, expect } from "@playwright/test";

const test = base.extend<{ gridPage: Locator }>({
  gridPage: async ({ page }, use) => {
    await page.goto("http://localhost:61000/?story=inputgrid--default-grid");
    const main = page.locator("main.ladle-main");
    const grid = main.locator("table");

    await use(grid);
  }
});

test.describe("InputGrid", () => {
  test("is visible", async ({ gridPage }) => {
    await expect(gridPage).toBeVisible();
  });

  test("Row has focused class when input has focus", async ({ gridPage }) => {
    const firstInput = gridPage.getByTestId("input1");
    const secondInput = gridPage.getByTestId("input2");

    //TODO: use proper locator methods
    const firstTR = firstInput.locator("..").locator("..");
    await firstInput.focus();

    await expect(firstTR).toHaveClass("focused");

    await secondInput.focus();
    //TODO: use proper locator methods
    const secondTR = secondInput.locator("..").locator("..");

    await expect(firstTR).not.toHaveClass("focused");
    await expect(secondTR).toHaveClass("focused");
  });

  test("Move focus arrow up and down and tab and enter", async ({ page, gridPage }) => {
    const firstInput = gridPage.getByTestId("input1");
    const secondInput = gridPage.getByTestId("input2");
    const thirdInput = gridPage.getByTestId("input3");

    await firstInput.focus();

    await page.keyboard.press("ArrowDown");
    await expect(secondInput).toBeFocused();

    await page.keyboard.press("ArrowUp");
    await expect(firstInput).toBeFocused();

    await page.keyboard.press("Tab");
    await expect(secondInput).toBeFocused();

    await page.keyboard.press("Enter");
    await expect(thirdInput).toBeFocused();
  });
});

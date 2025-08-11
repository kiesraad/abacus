import { expect } from "@playwright/test";

import { test } from "../../fixtures";

test.describe("initialisation", () => {
  test.use({
    baseURL: "http://127.0.0.1:8082",
  });

  test("it should redirect to the welcome page", async ({ page }) => {
    // use the webserver without fixtures
    await page.goto("/account/login");

    // expect the titles to contain a welcome message
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Welkom bij Abacus");
    await expect(page.getByRole("heading", { level: 2 })).toContainText("Installatie gelukt");

    // the path should be the initialise path
    await expect(page).toHaveURL("/account/initialise");
  });
});

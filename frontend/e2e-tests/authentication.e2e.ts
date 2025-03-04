import { expect, test } from "@playwright/test";

test.describe("authentication", () => {
  test("login happy path", async ({ page }) => {
    await page.goto("/account/login");

    await page.getByLabel("Gebruikersnaam").fill("admin");
    await page.getByLabel("Wachtwoord").fill("AdminPassword01");
    await page.getByRole("button", { name: "Inloggen" }).click();

    await page.waitForURL("/account/setup");

    // TODO: use new page object when we know which page to render
    await expect(page.getByRole("alert")).toContainText("Inloggen gelukt");
  });

  test("login unhappy path", async ({ page }) => {
    await page.goto("/account/login");

    await page.getByLabel("Gebruikersnaam").fill("admin");
    await page.getByLabel("Wachtwoord").fill("wrong-password");
    await page.getByRole("button", { name: "Inloggen" }).click();

    await expect(page.getByRole("alert")).toContainText("De gebruikersnaam of het wachtwoord is onjuist");
  });
});

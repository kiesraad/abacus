import { expect } from "@playwright/test";

import { FIXTURE_TYPIST_TEMP_PASSWORD, test } from "./fixtures";
import { NavBarPgObj } from "./page-objects/NavBarPgObj";

test.describe("authentication", () => {
  test("login happy path", async ({ page }) => {
    await page.goto("/account/login");

    await page.getByLabel("Gebruikersnaam").fill("admin");
    await page.getByLabel("Wachtwoord").fill("AdminPassword01");
    await page.getByRole("button", { name: "Inloggen" }).click();

    await page.waitForURL("/elections");

    // TODO: use new page object when we know which page to render
    await expect(page.getByText("Sanne Molenaar(Beheerder)")).toBeVisible();
  });

  test("login unhappy path", async ({ page }) => {
    await page.goto("/account/login");

    await page.getByLabel("Gebruikersnaam").fill("admin");
    await page.getByLabel("Wachtwoord").fill("wrong-password");
    await page.getByRole("button", { name: "Inloggen" }).click();

    await expect(page.getByRole("alert")).toContainText("De gebruikersnaam of het wachtwoord is onjuist");
  });

  test("first login", async ({ user, page }) => {
    // Login as a newly created user
    const username = user.username;
    const fullname = "Roep Achternaam";

    await page.goto("/account/login");
    await page.getByLabel("Gebruikersnaam").fill(username);
    await page.getByLabel("Wachtwoord").fill(FIXTURE_TYPIST_TEMP_PASSWORD);
    await page.getByRole("button", { name: "Inloggen" }).click();

    // Fill out the account setup page
    const password = "Sterk wachtwoord";
    await expect(page.getByRole("article").getByText(username)).toBeVisible();
    await page.getByRole("textbox", { name: "Jouw naam (roepnaam +" }).fill(fullname);
    await page.getByRole("textbox", { name: "Kies nieuw wachtwoord" }).fill(password);
    await page.getByRole("textbox", { name: "Herhaal wachtwoord" }).fill(password);
    await page.getByRole("button", { name: "Volgende" }).click();
    const navBarPgObj = new NavBarPgObj(page);
    await expect(navBarPgObj.navigation.getByText(fullname)).toBeVisible();
    await expect(page.getByRole("heading", { name: "Je account is ingesteld" })).toBeVisible();
  });
});

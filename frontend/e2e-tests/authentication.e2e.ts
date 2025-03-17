import { expect } from "@playwright/test";

import { FIXTURE_TYPIST_TEMP_PASSWORD, test } from "./fixtures";
import { NavBarPgObj } from "./page-objects/NavBarPgObj";

import { createRandomUsername } from "./helpers-utils/e2e-test-utils";
import { AccountSetupPgObj } from "./page-objects/authentication/AccountSetupPgObj";
import { LoginPgObj } from "./page-objects/authentication/LoginPgObj";
import { UserCreateDetailsPgObj } from "./page-objects/users/UserCreateDetailsPgObj";
import { UserCreateRolePgObj } from "./page-objects/users/UserCreateRolePgObj";
import { UserCreateTypePgObj } from "./page-objects/users/UserCreateTypePgObj";
import { UserListPgObj } from "./page-objects/users/UserListPgObj";

test.describe("authentication", () => {
  test("login happy path", async ({ page }) => {
    await page.goto("/account/login");

    const loginPgObj = new LoginPgObj(page);
    await loginPgObj.username.fill("admin");
    await loginPgObj.password.fill("AdminPassword01");
    await loginPgObj.loginBtn.click();

    await page.waitForURL("/elections");

    await expect(loginPgObj.navbar.username).toHaveText("Sanne Molenaar");
    await expect(loginPgObj.navbar.role).toHaveText("(Beheerder)");
  });

  test("login unhappy path", async ({ page }) => {
    await page.goto("/account/login");

    const loginPgObj = new LoginPgObj(page);
    await loginPgObj.username.fill("admin");
    await loginPgObj.password.fill("wrong-password");
    await loginPgObj.loginBtn.click();

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
    const accountSetupPgObj = new AccountSetupPgObj(page);
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

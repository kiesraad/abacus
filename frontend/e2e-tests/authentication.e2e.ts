import { expect } from "@playwright/test";

import { FIXTURE_TYPIST_TEMP_PASSWORD, test } from "./fixtures";
import { AccountSetupPgObj } from "./page-objects/authentication/AccountSetupPgObj";
import { LoginPgObj } from "./page-objects/authentication/LoginPgObj";
import { OverviewPgObj } from "./page-objects/election/OverviewPgObj";

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

    await expect(loginPgObj.alert).toContainText("De gebruikersnaam of het wachtwoord is onjuist");
  });

  test("first login", async ({ user, page }) => {
    // Login as a newly created user
    const username = user.username;

    const loginPgObj = new LoginPgObj(page);
    await page.goto("/account/login");
    await loginPgObj.username.fill(username);
    await loginPgObj.password.fill(FIXTURE_TYPIST_TEMP_PASSWORD);
    await loginPgObj.loginBtn.click();

    // Fill out the account setup page
    const password = "Sterk wachtwoord";
    const accountSetupPgObj = new AccountSetupPgObj(page);
    await accountSetupPgObj.fullname.fill(user.fullname!);
    await accountSetupPgObj.password.fill(password);
    await accountSetupPgObj.passwordRepeat.fill(password);
    await accountSetupPgObj.nextBtn.click();
    await expect(accountSetupPgObj.navBar.username).toHaveText(user.fullname!);

    const overviewPgObj = new OverviewPgObj(page);
    await expect(overviewPgObj.navBar.username).toHaveText(user.fullname!);
    await expect(overviewPgObj.alert).toBeVisible();
  });
});

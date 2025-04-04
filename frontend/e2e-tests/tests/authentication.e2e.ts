import { expect } from "@playwright/test";

import { FIXTURE_TYPIST_TEMP_PASSWORD, test } from "../fixtures";
import { AccountSetupPgObj } from "../page-objects/authentication/AccountSetupPgObj";
import { LoginPgObj } from "../page-objects/authentication/LoginPgObj";
import { OverviewPgObj } from "../page-objects/election/OverviewPgObj";

test.describe("authentication", () => {
  test("login happy path", async ({ page }) => {
    await page.goto("/account/login");

    const loginPage = new LoginPgObj(page);
    await loginPage.username.fill("admin");
    await loginPage.password.fill("AdminPassword01");
    await loginPage.loginBtn.click();

    await page.waitForURL("/elections");

    await expect(loginPage.navbar.username).toHaveText("Sanne Molenaar");
    await expect(loginPage.navbar.role).toHaveText("(Beheerder)");
  });

  test("login unhappy path", async ({ page }) => {
    await page.goto("/account/login");

    const loginPage = new LoginPgObj(page);
    await loginPage.username.fill("admin");
    await loginPage.password.fill("wrong-password");
    await loginPage.loginBtn.click();

    await expect(loginPage.alert).toContainText("De gebruikersnaam of het wachtwoord is onjuist");
  });

  test("first login", async ({ user, page }) => {
    // Login as a newly created user
    const username = user.username;

    const loginPage = new LoginPgObj(page);
    await page.goto("/account/login");
    await loginPage.username.fill(username);
    await loginPage.password.fill(FIXTURE_TYPIST_TEMP_PASSWORD);
    await loginPage.loginBtn.click();

    // Fill out the account setup page
    const password = "Sterk wachtwoord";
    const accountSetupPage = new AccountSetupPgObj(page);
    await accountSetupPage.fullname.fill(user.fullname!);
    await accountSetupPage.password.fill(password);
    await accountSetupPage.passwordRepeat.fill(password);
    await accountSetupPage.nextBtn.click();
    await expect(accountSetupPage.navBar.username).toHaveText(user.fullname!);

    const overviewPage = new OverviewPgObj(page);
    await expect(overviewPage.navBar.username).toHaveText(user.fullname!);
    await expect(overviewPage.alert).toBeVisible();
  });
});

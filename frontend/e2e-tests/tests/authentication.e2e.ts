import { expect } from "@playwright/test";
import { getTestPassword } from "e2e-tests/helpers-utils/e2e-test-api-helpers";
import { AccountSetupPgObj } from "e2e-tests/page-objects/authentication/AccountSetupPgObj";
import { LoginPgObj } from "e2e-tests/page-objects/authentication/LoginPgObj";
import { ElectionsOverviewPgObj } from "e2e-tests/page-objects/election/ElectionsOverviewPgObj";
import { AdminNavBar } from "e2e-tests/page-objects/nav_bar/AdminNavBarPgObj";
import { TypistNavBar } from "e2e-tests/page-objects/nav_bar/TypistNavBarPgObj";
import { FIXTURE_TYPIST_TEMP_PASSWORD, test } from "../fixtures";

test.describe("authentication", () => {
  test("login happy path", async ({ page }) => {
    await page.goto("/account/login");

    const loginPage = new LoginPgObj(page);
    await loginPage.username.fill("admin2");
    await loginPage.password.fill(getTestPassword("admin2"));
    await loginPage.loginBtn.click();

    await page.waitForURL("/elections");

    const navBar = new AdminNavBar(page);
    await expect(navBar.username).toHaveText("Jef van Reybrouck");
    await expect(navBar.role).toHaveText("(Beheerder)");
  });

  test("login unhappy path", async ({ page }) => {
    await page.goto("/account/login");

    const loginPage = new LoginPgObj(page);
    await loginPage.username.fill("admin");
    await loginPage.password.fill("wrong-password");
    await loginPage.loginBtn.click();

    await expect(loginPage.alert).toContainText("De gebruikersnaam of het wachtwoord is onjuist");
  });

  test("first login", async ({ newTypist, page }) => {
    // Login as a newly created user
    const username = newTypist.username;

    const loginPage = new LoginPgObj(page);
    await page.goto("/account/login");
    await loginPage.username.fill(username);
    await loginPage.password.fill(FIXTURE_TYPIST_TEMP_PASSWORD);
    await loginPage.loginBtn.click();

    // Fill out the account setup page
    const password = "Sterk wachtwoord";
    const accountSetupPage = new AccountSetupPgObj(page);
    await accountSetupPage.fullname.fill(newTypist.fullname!);
    await accountSetupPage.password.fill(password);
    await accountSetupPage.passwordRepeat.fill(password);
    await accountSetupPage.saveBtn.click();

    const navBar = new TypistNavBar(page);
    await expect(navBar.username).toHaveText(newTypist.fullname!);

    const overviewPage = new ElectionsOverviewPgObj(page);
    await expect(navBar.username).toHaveText(newTypist.fullname!);
    await expect(overviewPage.alertAccountSetup).toBeVisible();
  });
});

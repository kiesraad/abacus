import { expect, test } from "@playwright/test";

import { getTestPassword } from "../helpers-utils/e2e-test-api-helpers";
import { CreateFirstAdminPgObj } from "../page-objects/authentication/CreateFirstAdminPgObj";
import { FirstLoginPgObj } from "../page-objects/authentication/FirstLoginPgObj";
import { InitialiseWelcomePgObj } from "../page-objects/authentication/InitialiseWelcomePgObj";
import { LoginPgObj } from "../page-objects/authentication/LoginPgObj";
import { OverviewPgObj } from "../page-objects/election/OverviewPgObj";
import { AdminNavBar } from "../page-objects/nav_bar/AdminNavBarPgObj";
import { firstAdmin } from "../test-data/users";

test.describe.configure({ mode: "serial" });

test.describe("initialisation", () => {
  test("initialise first account", async ({ page }) => {
    await page.goto("/account/initialise");

    const welcomePage = new InitialiseWelcomePgObj(page);
    await expect(welcomePage.header).toBeVisible();
    await welcomePage.button.click();

    // add the first admin
    const password = getTestPassword(firstAdmin.username);

    const firstAdminPage = new CreateFirstAdminPgObj(page);
    await expect(firstAdminPage.header).toBeVisible();
    await firstAdminPage.fullname.fill(firstAdmin.fullname);
    await firstAdminPage.username.fill(firstAdmin.username);
    await firstAdminPage.password.fill(password);
    await firstAdminPage.confirmPassword.fill(password);
    await firstAdminPage.save.click();

    // login as first admin
    const firstLoginPage = new FirstLoginPgObj(page);
    await expect(firstLoginPage.header).toBeVisible();
    await firstLoginPage.username.fill(firstAdmin.username);
    await firstLoginPage.password.fill(password);
    await firstLoginPage.loginBtn.click();

    // check that we have logged in successfully and logout again
    const electionsPage = new OverviewPgObj(page);
    await expect(electionsPage.adminHeader).toBeVisible();

    const navBar = new AdminNavBar(page);
    await navBar.logout.click();

    const loginPage = new LoginPgObj(page);
    await expect(loginPage.loginBtn).toBeVisible();
  });

  test("initialisation can only be done once", async ({ page }) => {
    await page.goto("/account/initialise");

    const welcomePage = new InitialiseWelcomePgObj(page);
    await expect(welcomePage.header).toBeVisible();
    await welcomePage.button.click();

    const password = getTestPassword(firstAdmin.username);

    const secondFirstAdminPage = new CreateFirstAdminPgObj(page);
    await expect(secondFirstAdminPage.header).toBeVisible();
    await secondFirstAdminPage.fullname.fill(firstAdmin.fullname);
    await secondFirstAdminPage.username.fill(firstAdmin.username);
    await secondFirstAdminPage.password.fill(password);
    await secondFirstAdminPage.confirmPassword.fill(password);
    await secondFirstAdminPage.save.click();

    await expect(secondFirstAdminPage.alert).toHaveText(
      "De applicatie is al geconfigureerd. Je kan geen nieuwe beheerder aanmaken.",
    );
  });
});

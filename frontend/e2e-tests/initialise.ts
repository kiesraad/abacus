import { expect, request, test } from "@playwright/test";

import { Role } from "@/types/generated/openapi";

import { getTestPassword, loginAs } from "./helpers-utils/e2e-test-api-helpers";
import { CreateFirstAdminPgObj } from "./page-objects/authentication/CreateFirstAdminPgObj";
import { FirstLoginPgObj } from "./page-objects/authentication/FirstLoginPgObj";
import { InitialiseWelcomePgObj } from "./page-objects/authentication/InitialiseWelcomePgObj";
import { LoginPgObj } from "./page-objects/authentication/LoginPgObj";
import { OverviewPgObj } from "./page-objects/election/OverviewPgObj";
import { AdminNavBar } from "./page-objects/nav_bar/AdminNavBarPgObj";

const firstAdmin = {
  username: "admin1",
  fullname: "Sanne Molenaar",
};

const users: {
  username: string;
  fullname: string;
  role: Role;
}[] = [
  {
    username: "admin2",
    fullname: "Jef van Reybrouck",
    role: "administrator",
  },
  {
    username: "coordinator1",
    fullname: "Mohammed van der Velden",
    role: "coordinator",
  },
  {
    username: "coordinator2",
    fullname: "Mei Chen",
    role: "coordinator",
  },
  {
    username: "typist1",
    fullname: "Sam Kuijpers",
    role: "typist",
  },
  {
    username: "typist2",
    fullname: "Aliyah van den Berg",
    role: "typist",
  },
];

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
    await expect(electionsPage.header).toBeVisible();

    const navBar = new AdminNavBar(page);
    await navBar.logout.click();

    const loginPage = new LoginPgObj(page);
    await expect(loginPage.loginBtn).toBeVisible();

    await page.goto("/account/initialise");
    await expect(welcomePage.header).toBeVisible();
    await welcomePage.button.click();

    // add the first admin
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

  test.afterAll("create accounts", async () => {
    // create a new APIRequestContext
    const adminContext = await request.newContext();
    const loginResponse = await loginAs(adminContext, "admin1");
    expect(loginResponse.status()).toBe(200);

    await adminContext.storageState({ path: "e2e-tests/state/admin1.json" });

    for (const user of users) {
      const response = await adminContext.post("/api/user", {
        data: {
          ...user,
          temp_password: getTestPassword(user.username, "Temp"),
        },
      });
      expect(response.status()).toBe(201);
    }

    for (const user of users) {
      const userContext = await request.newContext();
      const loginResponse = await loginAs(userContext, user.username, "Temp");
      expect(loginResponse.status()).toBe(200);

      const response = await userContext.put("/api/user/account", {
        data: {
          username: user.username,
          fullname: user.fullname,
          password: getTestPassword(user.username),
        },
      });

      expect(response.status()).toBe(200);
      await userContext.storageState({ path: `e2e-tests/state/${user.username}.json` });
    }
  });
});

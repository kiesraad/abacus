import { expect, test } from "@playwright/test";

import { createRandomUsername } from "./helpers-utils/e2e-test-utils";
import { NavBarPgObj } from "./page-objects/NavBarPgObj";
import { UserCreateDetailsPgObj } from "./page-objects/users/UserCreateDetailsPgObj";
import { UserCreateRolePgObj } from "./page-objects/users/UserCreateRolePgObj";
import { UserCreateTypePgObj } from "./page-objects/users/UserCreateTypePgObj";
import { UserListPgObj } from "./page-objects/users/UserListPgObj";

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

  test("first login", async ({ page }) => {
    // Login as admin and create a user
    await page.goto("/account/login");
    await page.getByLabel("Gebruikersnaam").fill("admin");
    await page.getByLabel("Wachtwoord").fill("AdminPassword01");
    await page.getByRole("button", { name: "Inloggen" }).click();

    const navBarPgObj = new NavBarPgObj(page);
    await expect(navBarPgObj.logout).toBeVisible();

    const username = createRandomUsername("Invoerder");
    const fullname = "Roep Achternaam";
    const tempPassword = "Tijdelijk wachtwoord";
    await page.goto(`/users`);

    const userListPgObj = new UserListPgObj(page);
    await userListPgObj.create.click();

    const userCreateRolePgObj = new UserCreateRolePgObj(page);
    await userCreateRolePgObj.typist.click();
    await userCreateRolePgObj.continue.click();

    const userCreateTypePgObj = new UserCreateTypePgObj(page);
    await userCreateTypePgObj.anonymous.click();
    await userCreateTypePgObj.continue.click();

    const userCreateDetailsPgObj = new UserCreateDetailsPgObj(page);
    await userCreateDetailsPgObj.username.fill(username);
    await userCreateDetailsPgObj.password.fill(tempPassword);
    await userCreateDetailsPgObj.save.click();
    await expect(userListPgObj.alert).toContainText(`${username} is toegevoegd met de rol Invoerder`);
    await expect(userListPgObj.table).toContainText(username);

    // Logout
    await navBarPgObj.logout.click();

    // Login as the newly created user
    await page.goto("/account/login");
    await page.getByLabel("Gebruikersnaam").fill(username);
    await page.getByLabel("Wachtwoord").fill(tempPassword);
    await page.getByRole("button", { name: "Inloggen" }).click();

    // Fill out the account setup page
    const password = "Sterk wachtwoord";
    await expect(page.getByRole("article").getByText(username)).toBeVisible();
    await page.getByRole("textbox", { name: "Jouw naam (roepnaam +" }).fill(fullname);
    await page.getByRole("textbox", { name: "Kies nieuw wachtwoord" }).fill(password);
    await page.getByRole("textbox", { name: "Herhaal wachtwoord" }).fill(password);
    await page.getByRole("button", { name: "Volgende" }).click();
    await expect(navBarPgObj.navigation.getByText(fullname)).toBeVisible();
    await expect(page.getByRole("heading", { name: "Je account is ingesteld" })).toBeVisible();
  });
});

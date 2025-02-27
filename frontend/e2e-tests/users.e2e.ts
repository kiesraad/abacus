import { expect } from "@playwright/test";

import { test } from "./fixtures";
import { createRandomUsername } from "./helpers-utils/e2e-test-utils";
import { UserCreateDetailsPgObj } from "./page-objects/users/UserCreateDetailsPgObj";
import { UserCreateRolePgObj } from "./page-objects/users/UserCreateRolePgObj";
import { UserCreateTypePgObj } from "./page-objects/users/UserCreateTypePgObj";
import { UserListPgObj } from "./page-objects/users/UserListPgObj";

test.use({
  storageState: "e2e-tests/state/admin.json",
});

test.describe("Users", () => {
  test("create a user with role administrator", async ({ page }) => {
    const username = createRandomUsername("Beheerder");
    await page.goto(`/users`);

    const userListPgObj = new UserListPgObj(page);
    await userListPgObj.create.click();

    const userCreateRolePgObj = new UserCreateRolePgObj(page);
    await expect(userCreateRolePgObj.administrator).not.toBeChecked();
    await expect(userCreateRolePgObj.coordinator).not.toBeChecked();
    await expect(userCreateRolePgObj.typist).not.toBeChecked();

    await userCreateRolePgObj.administrator.click();
    await userCreateRolePgObj.continue.click();

    const userCreateDetailsPgObj = new UserCreateDetailsPgObj(page);
    await expect(userCreateDetailsPgObj.fullname).toBeVisible();
    await userCreateDetailsPgObj.username.fill(username);
    await userCreateDetailsPgObj.fullname.fill("Volledige naam");
    await userCreateDetailsPgObj.password.fill("Tijdelijk wachtwoord");
    await userCreateDetailsPgObj.save.click();

    await expect(userListPgObj.alert).toContainText(`${username} is toegevoegd met de rol Beheerder`);
    await expect(userListPgObj.table).toContainText(username);
  });

  test("create an anonymous user with role typist", async ({ page }) => {
    const username = createRandomUsername("Invoerder");
    await page.goto(`/users`);

    const userListPgObj = new UserListPgObj(page);
    await userListPgObj.create.click();

    const userCreateRolePgObj = new UserCreateRolePgObj(page);
    await expect(userCreateRolePgObj.administrator).not.toBeChecked();
    await expect(userCreateRolePgObj.coordinator).not.toBeChecked();
    await expect(userCreateRolePgObj.typist).not.toBeChecked();

    await userCreateRolePgObj.typist.click();
    await userCreateRolePgObj.continue.click();

    const userCreateTypePgObj = new UserCreateTypePgObj(page);
    await expect(userCreateTypePgObj.withName).toBeChecked();
    await userCreateTypePgObj.anonymous.click();
    await userCreateTypePgObj.continue.click();

    const userCreateDetailsPgObj = new UserCreateDetailsPgObj(page);
    await expect(userCreateDetailsPgObj.fullname).toBeHidden();
    await userCreateDetailsPgObj.username.fill(username);
    await userCreateDetailsPgObj.password.fill("Tijdelijk wachtwoord");
    await userCreateDetailsPgObj.save.click();

    await expect(userListPgObj.alert).toContainText(`${username} is toegevoegd met de rol Invoerder`);
    await expect(userListPgObj.table).toContainText(username);
  });
});

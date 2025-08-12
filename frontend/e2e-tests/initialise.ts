import { expect, request, test } from "@playwright/test";

import { Role } from "@/types/generated/openapi";

import { getTestPassword, loginAs } from "./helpers-utils/e2e-test-api-helpers";

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

test("initialise first account", async ({ page }) => {
  await page.goto("/account/initialise");

  await expect(page.getByRole("heading", { level: 1, name: "Welkom bij Abacus" })).toBeVisible();
  await page.getByRole("button", { name: "Account voor beheerder" }).click();

  // add the first admin
  const password = getTestPassword(firstAdmin.username);

  await expect(page.getByRole("heading", { level: 1, name: "Account voor beheerder aanmaken" })).toBeVisible();
  await page.getByRole("textbox", { name: "Jouw naam (roepnaam +" }).fill(firstAdmin.fullname);
  await page.getByRole("textbox", { name: "Gebruikersnaam" }).fill(firstAdmin.username);
  await page.getByRole("textbox", { name: "Kies een wachtwoord" }).fill(password);
  await page.getByRole("textbox", { name: "Herhaal wachtwoord" }).fill(password);
  await page.getByRole("button", { name: "Opslaan" }).click();

  // login as first admin
  await expect(page.getByRole("heading", { level: 1, name: "Inloggen met account van beheerder" })).toBeVisible();
  await page.getByRole("textbox", { name: "Gebruikersnaam" }).fill(firstAdmin.username);
  await page.getByRole("textbox", { name: "Wachtwoord" }).fill(password);
  await page.getByRole("button", { name: "Inloggen" }).click();

  // check that we have logged in successfully and logout again
  await expect(page.getByRole("heading", { name: "Beheer verkiezingen" })).toBeVisible();
  await page.getByRole("link", { name: "Afmelden" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Inloggen" })).toBeVisible();

  await page.goto("/account/initialise");
  await expect(page.getByRole("heading", { level: 1, name: "Welkom bij Abacus" })).toBeVisible();
  await page.getByRole("button", { name: "Account voor beheerder" }).click();

  // add the first admin
  await expect(page.getByRole("heading", { level: 1, name: "Account voor beheerder aanmaken" })).toBeVisible();
  await page.getByRole("textbox", { name: "Jouw naam (roepnaam +" }).fill("admin2");
  await page.getByRole("textbox", { name: "Gebruikersnaam" }).fill("Second Admin");
  await page.getByRole("textbox", { name: "Kies een wachtwoord" }).fill("SecondAdminPassword01");
  await page.getByRole("textbox", { name: "Herhaal wachtwoord" }).fill("SecondAdminPassword01");
  await page.getByRole("button", { name: "Opslaan" }).click();

  await expect(page.getByRole("alert")).toHaveText(
    "De applicatie is al geconfigureerd. Je kan geen nieuwe beheerder aanmaken.",
  );
});

test("create accounts", async () => {
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

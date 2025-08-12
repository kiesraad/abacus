import { expect, test } from "@playwright/test";

import { loginAs } from "./helpers-utils/e2e-test-api-helpers";

const firstAdmin = {
  username: "admin1",
  password: "AdminPassword01",
  fullname: "Sanne Molenaar",
};

const users = [
  {
    username: "admin2",
    fullname: "Jef van Reybrouck",
    role: "Beheerder",
    password: "Admin2Password01",
  },
  {
    username: "coordinator1",
    fullname: "Mohammed van der Velden",
    role: "Coördinator",
    password: "CoordinatorPassword01",
  },
  {
    username: "coordinator2",
    fullname: "Mei Chen",
    role: "Coördinator",
    password: "Coordinator2Password01",
  },
  {
    username: "typist1",
    fullname: "Sam Kuijpers",
    role: "Invoerder",
    password: "TypistPassword01",
  },
  {
    username: "typist2",
    fullname: "Aliyah van den Berg",
    role: "Invoerder",
    password: "Typist2Password01",
  },
];

test("initialise first account", async ({ page }) => {
  await page.goto("/account/initialise");

  await expect(page.getByRole("heading", { level: 1, name: "Welkom bij Abacus" })).toBeVisible();
  await page.getByRole("button", { name: "Account voor beheerder" }).click();

  // add the first admin
  await expect(page.getByRole("heading", { level: 1, name: "Account voor beheerder aanmaken" })).toBeVisible();
  await page.getByRole("textbox", { name: "Jouw naam (roepnaam +" }).fill(firstAdmin.fullname);
  await page.getByRole("textbox", { name: "Gebruikersnaam" }).fill(firstAdmin.username);
  await page.getByRole("textbox", { name: "Kies een wachtwoord" }).fill(firstAdmin.password);
  await page.getByRole("textbox", { name: "Herhaal wachtwoord" }).fill(firstAdmin.password);
  await page.getByRole("button", { name: "Opslaan" }).click();

  // login as first admin
  await expect(page.getByRole("heading", { level: 1, name: "Inloggen met account van beheerder" })).toBeVisible();
  await page.getByRole("textbox", { name: "Gebruikersnaam" }).fill(firstAdmin.username);
  await page.getByRole("textbox", { name: "Wachtwoord" }).fill(firstAdmin.password);
  await page.getByRole("button", { name: "Inloggen" }).click();
});

test("create accounts", async ({ page }) => {
  await page.goto("/account/login");

  await expect(page.getByRole("heading", { level: 1, name: "Inloggen" })).toBeVisible();
  await page.getByRole("textbox", { name: "Gebruikersnaam" }).fill(firstAdmin.username);
  await page.getByRole("textbox", { name: "Wachtwoord" }).fill(firstAdmin.password);
  await page.getByRole("button", { name: "Inloggen" }).click();

  // add all users
  for (const user of users) {
    const tempPassword = `Temp${user.password}`;

    await page.getByRole("link", { name: "Gebruikers" }).click();

    await expect(page.getByRole("heading", { level: 1, name: "Gebruikersbeheer" })).toBeVisible();
    await page.getByRole("link", { name: "Gebruiker toevoegen" }).click();

    await expect(page.getByRole("heading", { level: 1, name: "Gebruiker toevoegen" })).toBeVisible();
    await page.getByRole("radio", { name: user.role }).check();
    await page.getByRole("button", { name: "Verder" }).click();

    if (user.role === "Invoerder") {
      await expect(page.getByRole("heading", { level: 1, name: "Invoerder toevoegen" })).toBeVisible();
      await page.getByRole("radio", { name: "Op naam (bijvoorbeeld 'MariekeDeJager')" }).check();
      await page.getByRole("button", { name: "Verder" }).click();
    }

    await expect(page.getByRole("heading", { level: 1, name: `${user.role} toevoegen` })).toBeVisible();
    await page.getByRole("textbox", { name: "Gebruikersnaam" }).fill(user.username);
    await page.getByRole("textbox", { name: "Volledige naam" }).fill(user.fullname);
    await page.getByRole("textbox", { name: "Tijdelijk wachtwoord" }).fill(tempPassword);
    await page.getByRole("button", { name: "Opslaan" }).click();

    await expect(page.getByRole("heading", { level: 1, name: "Gebruikersbeheer" })).toBeVisible();
  }
});

// configure all users passwords
for (const user of users) {
  test(`initialise account ${user.username}`, async ({ page }) => {
    const tempPassword = `Temp${user.password}`;
    await page.goto("/account/login");

    await expect(page.getByRole("heading", { level: 1, name: "Inloggen" })).toBeVisible();
    await page.getByRole("textbox", { name: "Gebruikersnaam" }).fill(user.username);
    await page.getByRole("textbox", { name: "Wachtwoord" }).fill(tempPassword);
    await page.getByRole("button", { name: "Inloggen" }).click();

    await expect(page.getByRole("heading", { level: 1, name: "Account instellen" })).toBeVisible();
    await page.getByRole("textbox", { name: "Kies nieuw wachtwoord" }).fill(user.password);
    await page.getByRole("textbox", { name: "Herhaal wachtwoord" }).fill(user.password);
    await page.getByRole("button", { name: "Volgende" }).click();

    await expect(page.getByRole("heading", { level: 2, name: "Je account is ingesteld" })).toBeVisible();
  });
}

test("store session states", async ({ request }) => {
  await loginAs(request, "admin1");
  await request.storageState({ path: "e2e-tests/state/admin.json" });

  await loginAs(request, "coordinator1");
  await request.storageState({ path: "e2e-tests/state/coordinator.json" });

  await loginAs(request, "typist1");
  await request.storageState({ path: "e2e-tests/state/typist.json" });

  await loginAs(request, "typist2");
  await request.storageState({ path: "e2e-tests/state/typist2.json" });
});

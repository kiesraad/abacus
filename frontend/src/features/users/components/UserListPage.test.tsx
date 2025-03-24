import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, test } from "vitest";

import { overrideOnce, render, server } from "@/testing";
import { UserListRequestHandler, userMockData } from "@/testing/api-mocks";

import { UserListPage } from "./UserListPage";

describe("PollingStationListPage", () => {
  beforeEach(() => {
    server.use(UserListRequestHandler);
  });

  test("Show users", async () => {
    render(<UserListPage />);

    const table = await screen.findByRole("table");
    expect(table).toBeVisible();
    expect(table).toHaveTableContent([
      ["Gebruikersnaam", "Rol", "Volledige naam", "Laatste activiteit"],
      ["Sanne", "Beheerder", "Sanne Molenaar", "vandaag 10:20"],
      ["Jayden", "Coördinator", "Jayden Ahmen", "gisteren 10:20"],
      ["Gebruiker01", "Invoerder", "Nog niet gebruikt", "–"],
      ["Gebruiker02", "Invoerder", "Nog niet gebruikt", "–"],
      ["Gebruiker03", "Invoerder", "Nog niet gebruikt", "–"],
    ]);
  });

  test("Show users", async () => {
    const users = [userMockData[2], userMockData[1], userMockData[4], userMockData[0], userMockData[3]];
    overrideOnce("get", "/api/user", 200, { users });
    render(<UserListPage />);

    const table = await screen.findByRole("table");
    expect(table).toBeVisible();
    expect(table).toHaveTableContent([
      ["Gebruikersnaam", "Rol", "Volledige naam", "Laatste activiteit"],
      ["Sanne", "Beheerder", "Sanne Molenaar", "vandaag 10:20"],
      ["Jayden", "Coördinator", "Jayden Ahmen", "gisteren 10:20"],
      ["Gebruiker01", "Invoerder", "Nog niet gebruikt", "–"],
      ["Gebruiker02", "Invoerder", "Nog niet gebruikt", "–"],
      ["Gebruiker03", "Invoerder", "Nog niet gebruikt", "–"],
    ]);
  });
});

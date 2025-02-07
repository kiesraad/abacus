import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, test } from "vitest";

import { UserListRequestHandler } from "@kiesraad/api-mocks";
import { render, server } from "@kiesraad/test";

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
      ["Gebruikersnaam", "Rol", "Volledige naam", "Laatste activiteit", ""],
      ["Sanne", "Beheerder", "Sanne Molenaar", "vandaag 10:20", ""],
      ["Jayden", "Coördinator", "Jayden Ahmen", "vandaag 13:37", ""],
      ["Gebruiker01", "Invoerder", "Nog niet gebruikt", "–", ""],
      ["Gebruiker02", "Invoerder", "Nog niet gebruikt", "–", ""],
      ["Gebruiker03", "Invoerder", "Nog niet gebruikt", "–", ""],
    ]);
  });
});

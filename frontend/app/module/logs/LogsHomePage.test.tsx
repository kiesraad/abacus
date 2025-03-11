import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test } from "vitest";

import { LogRequestHandler } from "@kiesraad/api-mocks";
import { render, server } from "@kiesraad/test";

import { LogsHomePage } from "./LogsHomePage";

describe("LogsHomePage", () => {
  beforeEach(() => {
    server.use(LogRequestHandler);
  });

  test("Show audit log events", async () => {
    render(<LogsHomePage />);

    const table = await screen.findByRole("table");
    expect(table).toBeVisible();
    expect(table).toHaveTableContent([
      ["Nummer", "Tijdstip", "Werkplek", "Type", "Gebeurtenis", "Toelichting", "Gebruiker"],
      ["24", "11 mrt 10:02", "-", "Succes", "Gebruiker ingelogd", "", "Sanne Molenaar (Beheerder)"],
      ["22", "11 mrt 10:02", "-", "Succes", "Gebruiker ingelogd", "", "Sanne Molenaar (Beheerder)"],
      ["23", "11 mrt 10:02", "-", "Succes", "Gebruiker uitgelogd", "", "Sanne Molenaar (Beheerder)"],
      ["21", "11 mrt 10:02", "-", "Succes", "Gebruiker uitgelogd", "", "Sam Kuijpers (Invoerder)"],
      ["19", "11 mrt 10:02", "-", "Succes", "Gebruiker uitgelogd", "", "Mohammed van der Velden (Coördinator)"],
      ["20", "11 mrt 10:02", "-", "Succes", "Gebruiker ingelogd", "", "Sam Kuijpers (Invoerder)"],
      ["18", "11 mrt 10:02", "-", "Succes", "Gebruiker ingelogd", "", "Mohammed van der Velden (Coördinator)"],
      ["16", "11 mrt 10:02", "-", "Succes", "Gebruiker ingelogd", "", "Mohammed van der Velden (Coördinator)"],
      ["17", "11 mrt 10:02", "-", "Succes", "Gebruiker uitgelogd", "", "Mohammed van der Velden (Coördinator)"],
      ["14", "11 mrt 10:02", "-", "Succes", "Gebruiker ingelogd", "", "Sam Kuijpers (Invoerder)"],
    ]);

    const user = userEvent.setup();
    const nextButton = (await screen.findAllByRole("button", { name: "Volgende" }))[0] as HTMLButtonElement;
    await user.click(nextButton);

    expect(table).toHaveTableContent([
      ["Nummer", "Tijdstip", "Werkplek", "Type", "Gebeurtenis", "Toelichting", "Gebruiker"],
      ["15", "11 mrt 10:02", "-", "Succes", "Gebruiker uitgelogd", "", "Sam Kuijpers (Invoerder)"],
      ["13", "11 mrt 10:02", "-", "Succes", "Gebruiker uitgelogd", "", "Sanne Molenaar (Beheerder)"],
      ["11", "11 mrt 10:02", "-", "Succes", "Gebruiker uitgelogd", "", "Sam Kuijpers (Invoerder)"],
      ["12", "11 mrt 10:02", "-", "Succes", "Gebruiker ingelogd", "", "Sanne Molenaar (Beheerder)"],
      ["10", "11 mrt 10:02", "-", "Succes", "Gebruiker ingelogd", "", "Sam Kuijpers (Invoerder)"],
      ["8", "11 mrt 10:02", "-", "Succes", "Gebruiker ingelogd", "", "Mohammed van der Velden (Coördinator)"],
      ["9", "11 mrt 10:02", "-", "Succes", "Gebruiker uitgelogd", "", "Mohammed van der Velden (Coördinator)"],
      ["6", "11 mrt 10:02", "-", "Succes", "Gebruiker ingelogd", "", "Sam Kuijpers (Invoerder)"],
      ["7", "11 mrt 10:02", "-", "Succes", "Gebruiker uitgelogd", "", "Sam Kuijpers (Invoerder)"],
      ["5", "11 mrt 10:02", "-", "Succes", "Gebruiker uitgelogd", "", "Sanne Molenaar (Beheerder)"],
    ]);
  });
});

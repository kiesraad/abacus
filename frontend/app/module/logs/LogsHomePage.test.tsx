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

  test("Show polling stations", async () => {
    render(<LogsHomePage />);

    const table = await screen.findByRole("table");
    expect(table).toBeVisible();
    expect(table).toHaveTableContent([
      ["Nummer", "Tijdstip", "Werkplek", "Type", "Gebeurtenis", "Toelichting", "Gebruiker", ""],
      ["24", "vandaag 10:02", "-", "Succes", "Gebruiker ingelogd", "", "Sanne Molenaar (Beheerder)", "Details"],
      ["22", "vandaag 10:02", "-", "Succes", "Gebruiker ingelogd", "", "Sanne Molenaar (Beheerder)", "Details"],
      ["23", "vandaag 10:02", "-", "Succes", "Gebruiker uitgelogd", "", "Sanne Molenaar (Beheerder)", "Details"],
      ["21", "vandaag 10:02", "-", "Succes", "Gebruiker uitgelogd", "", "Sam Kuijpers (Invoerder)", "Details"],
      [
        "19",
        "vandaag 10:02",
        "-",
        "Succes",
        "Gebruiker uitgelogd",
        "",
        "Mohammed van der Velden (Coördinator)",
        "Details",
      ],
      ["20", "vandaag 10:02", "-", "Succes", "Gebruiker ingelogd", "", "Sam Kuijpers (Invoerder)", "Details"],
      [
        "18",
        "vandaag 10:02",
        "-",
        "Succes",
        "Gebruiker ingelogd",
        "",
        "Mohammed van der Velden (Coördinator)",
        "Details",
      ],
      [
        "16",
        "vandaag 10:02",
        "-",
        "Succes",
        "Gebruiker ingelogd",
        "",
        "Mohammed van der Velden (Coördinator)",
        "Details",
      ],
      [
        "17",
        "vandaag 10:02",
        "-",
        "Succes",
        "Gebruiker uitgelogd",
        "",
        "Mohammed van der Velden (Coördinator)",
        "Details",
      ],
      ["14", "vandaag 10:02", "-", "Succes", "Gebruiker ingelogd", "", "Sam Kuijpers (Invoerder)", "Details"],
    ]);

    const user = userEvent.setup();
    const nextButton = (await screen.findAllByRole("button", { name: "Volgende" }))[0] as HTMLButtonElement;
    await user.click(nextButton);

    expect(table).toHaveTableContent([
      ["Nummer", "Tijdstip", "Werkplek", "Type", "Gebeurtenis", "Toelichting", "Gebruiker", ""],
      ["15", "vandaag 10:02", "-", "Succes", "Gebruiker uitgelogd", "", "Sam Kuijpers (Invoerder)", "Details"],
      ["13", "vandaag 10:02", "-", "Succes", "Gebruiker uitgelogd", "", "Sanne Molenaar (Beheerder)", "Details"],
      ["11", "vandaag 10:02", "-", "Succes", "Gebruiker uitgelogd", "", "Sam Kuijpers (Invoerder)", "Details"],
      ["12", "vandaag 10:02", "-", "Succes", "Gebruiker ingelogd", "", "Sanne Molenaar (Beheerder)", "Details"],
      ["10", "vandaag 10:02", "-", "Succes", "Gebruiker ingelogd", "", "Sam Kuijpers (Invoerder)", "Details"],
      [
        "8",
        "vandaag 10:02",
        "-",
        "Succes",
        "Gebruiker ingelogd",
        "",
        "Mohammed van der Velden (Coördinator)",
        "Details",
      ],
      [
        "9",
        "vandaag 10:02",
        "-",
        "Succes",
        "Gebruiker uitgelogd",
        "",
        "Mohammed van der Velden (Coördinator)",
        "Details",
      ],
      ["6", "vandaag 10:02", "-", "Succes", "Gebruiker ingelogd", "", "Sam Kuijpers (Invoerder)", "Details"],
      ["7", "vandaag 10:02", "-", "Succes", "Gebruiker uitgelogd", "", "Sam Kuijpers (Invoerder)", "Details"],
      ["5", "vandaag 10:02", "-", "Succes", "Gebruiker uitgelogd", "", "Sanne Molenaar (Beheerder)", "Details"],
    ]);
  });
});

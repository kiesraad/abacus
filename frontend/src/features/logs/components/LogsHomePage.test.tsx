import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test } from "vitest";

import { render, server } from "@/testing";
import { LogRequestHandler, UserListRequestHandler } from "@/testing/api-mocks";

import { LogsHomePage } from "./LogsHomePage";

describe("LogsHomePage", () => {
  beforeEach(() => {
    server.use(LogRequestHandler, UserListRequestHandler);
  });

  test("Show audit log events", async () => {
    render(<LogsHomePage />);

    const table = await screen.findByRole("table");
    expect(table).toBeVisible();

    await waitFor(() => {
      expect(table).toHaveTableContent([
        ["Nummer", "Tijdstip", "Werkplek", "Type", "Gebeurtenis", "Gebruiker"],
        ["24", "11 mrt 10:02", "-", "Succes", "Gebruiker ingelogd", "Sanne Molenaar (Beheerder)"],
        ["22", "11 mrt 10:02", "-", "Succes", "Gebruiker ingelogd", "Sanne Molenaar (Beheerder)"],
        ["23", "11 mrt 10:02", "-", "Succes", "Gebruiker uitgelogd", "Sanne Molenaar (Beheerder)"],
        ["21", "11 mrt 10:02", "-", "Succes", "Gebruiker uitgelogd", "Sam Kuijpers (Invoerder)"],
        ["19", "11 mrt 10:02", "-", "Succes", "Gebruiker uitgelogd", "Mohammed van der Velden (Coördinator)"],
        ["20", "11 mrt 10:02", "-", "Succes", "Gebruiker ingelogd", "Sam Kuijpers (Invoerder)"],
        ["18", "11 mrt 10:02", "-", "Succes", "Gebruiker ingelogd", "Mohammed van der Velden (Coördinator)"],
        ["16", "11 mrt 10:02", "-", "Succes", "Gebruiker ingelogd", "Mohammed van der Velden (Coördinator)"],
        ["17", "11 mrt 10:02", "-", "Succes", "Gebruiker uitgelogd", "Mohammed van der Velden (Coördinator)"],
        ["14", "11 mrt 10:02", "-", "Succes", "Gebruiker ingelogd", "Sam Kuijpers (Invoerder)"],
      ]);
    });

    const user = userEvent.setup();
    const nextButton = (await screen.findAllByRole("button", { name: "Volgende" }))[0] as HTMLButtonElement;
    await user.click(nextButton);

    await waitFor(() => {
      expect(table).toHaveTableContent([
        ["Nummer", "Tijdstip", "Werkplek", "Type", "Gebeurtenis", "Gebruiker"],
        ["15", "11 mrt 10:02", "-", "Succes", "Gebruiker uitgelogd", "Sam Kuijpers (Invoerder)"],
        ["13", "11 mrt 10:02", "-", "Succes", "Gebruiker uitgelogd", "Sanne Molenaar (Beheerder)"],
        ["11", "11 mrt 10:02", "-", "Succes", "Gebruiker uitgelogd", "Sam Kuijpers (Invoerder)"],
        ["12", "11 mrt 10:02", "-", "Succes", "Gebruiker ingelogd", "Sanne Molenaar (Beheerder)"],
        ["10", "11 mrt 10:02", "-", "Succes", "Gebruiker ingelogd", "Sam Kuijpers (Invoerder)"],
        ["8", "11 mrt 10:02", "-", "Succes", "Gebruiker ingelogd", "Mohammed van der Velden (Coördinator)"],
        ["9", "11 mrt 10:02", "-", "Succes", "Gebruiker uitgelogd", "Mohammed van der Velden (Coördinator)"],
        ["6", "11 mrt 10:02", "-", "Succes", "Gebruiker ingelogd", "Sam Kuijpers (Invoerder)"],
        ["7", "11 mrt 10:02", "-", "Succes", "Gebruiker uitgelogd", "Sam Kuijpers (Invoerder)"],
        ["5", "11 mrt 10:02", "-", "Succes", "Gebruiker uitgelogd", "Sanne Molenaar (Beheerder)"],
      ]);
    });
  });

  test("Show audit log event details", async () => {
    render(<LogsHomePage />);

    const table = await screen.findByRole("table");
    expect(table).toBeVisible();

    const user = userEvent.setup();
    const firstRow = (await screen.findAllByRole("row"))[1] as HTMLTableRowElement;
    await user.click(firstRow);

    const list = await screen.findByRole("list");
    expect(list).toBeVisible();

    expect(list).toHaveTextContent(
      [
        "Tijdstip",
        "11 maart 2025 om 10:02",
        "GebruikerSanne Molenaar (Beheerder)",
        "Toelichting",
        "-",
        "IP-adres",
        "127.0.0.1",
        "User agent",
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36",
        "Aantal ingelogde gebruikers",
        "0",
      ].join(""),
    );

    const closeButton = await screen.findByRole("button", { name: "Annuleren" });
    await user.click(closeButton);

    expect(list).not.toBeVisible();
  });

  test("Filter events", async () => {
    render(<LogsHomePage />);

    const table = await screen.findByRole("table");
    expect(table).toBeVisible();

    const filterButton = await screen.findByRole("button", { name: "Filteren" });
    await userEvent.click(filterButton);

    await waitFor(() => {
      // a event option
      expect(screen.getByTestId("event-UserLoggedIn")).toBeInTheDocument();
    });

    const eventOption = await screen.findByTestId("event-UserLoggedIn");
    await userEvent.click(eventOption);

    const levelOption = await screen.findByTestId("level-success");
    await userEvent.click(levelOption);

    const userOption1 = await screen.findByTestId("user-1");
    await userEvent.click(userOption1);

    const userOption2 = await screen.findByTestId("user-2");
    await userEvent.click(userOption2);

    const since = await screen.findByLabelText("Sinds");
    await userEvent.type(since, "2025-03-11T10:00");

    await waitFor(() => {
      expect(table).toHaveTableContent([
        ["Nummer", "Tijdstip", "Werkplek", "Type", "Gebeurtenis", "Gebruiker"],
        ["24", "11 mrt 10:02", "-", "Succes", "Gebruiker ingelogd", "Sanne Molenaar (Beheerder)"],
        ["22", "11 mrt 10:02", "-", "Succes", "Gebruiker ingelogd", "Sanne Molenaar (Beheerder)"],
        ["20", "11 mrt 10:02", "-", "Succes", "Gebruiker ingelogd", "Sam Kuijpers (Invoerder)"],
        ["14", "11 mrt 10:02", "-", "Succes", "Gebruiker ingelogd", "Sam Kuijpers (Invoerder)"],
      ]);
    });

    const clearButton = await screen.findByRole("button", { name: "Filter sluiten" });
    await userEvent.click(clearButton);

    expect(table).toHaveTableContent([
      ["Nummer", "Tijdstip", "Werkplek", "Type", "Gebeurtenis", "Gebruiker"],
      ["24", "11 mrt 10:02", "-", "Succes", "Gebruiker ingelogd", "Sanne Molenaar (Beheerder)"],
      ["22", "11 mrt 10:02", "-", "Succes", "Gebruiker ingelogd", "Sanne Molenaar (Beheerder)"],
      ["23", "11 mrt 10:02", "-", "Succes", "Gebruiker uitgelogd", "Sanne Molenaar (Beheerder)"],
      ["21", "11 mrt 10:02", "-", "Succes", "Gebruiker uitgelogd", "Sam Kuijpers (Invoerder)"],
      ["19", "11 mrt 10:02", "-", "Succes", "Gebruiker uitgelogd", "Mohammed van der Velden (Coördinator)"],
      ["20", "11 mrt 10:02", "-", "Succes", "Gebruiker ingelogd", "Sam Kuijpers (Invoerder)"],
      ["18", "11 mrt 10:02", "-", "Succes", "Gebruiker ingelogd", "Mohammed van der Velden (Coördinator)"],
      ["16", "11 mrt 10:02", "-", "Succes", "Gebruiker ingelogd", "Mohammed van der Velden (Coördinator)"],
      ["17", "11 mrt 10:02", "-", "Succes", "Gebruiker uitgelogd", "Mohammed van der Velden (Coördinator)"],
      ["14", "11 mrt 10:02", "-", "Succes", "Gebruiker ingelogd", "Sam Kuijpers (Invoerder)"],
    ]);
  });
});

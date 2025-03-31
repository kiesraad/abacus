import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test } from "vitest";

import { render, server, spyOnHandler } from "@/testing";
import { LogRequestHandler, LogUsersRequestHandler } from "@/testing/api-mocks";

import { LogsHomePage } from "./LogsHomePage";

describe("LogsHomePage", () => {
  beforeEach(() => {
    server.use(LogRequestHandler, LogUsersRequestHandler);
  });

  test("Show audit log events", async () => {
    render(<LogsHomePage />);

    const table = await screen.findByRole("table");
    expect(table).toBeVisible();

    await waitFor(() => {
      expect(table).toHaveTableContent([
        ["Nummer", "Tijdstip", "Type", "Gebeurtenis", "Gebruiker: id, gebruikersnaam (rol)"],
        ["24", "11 mrt 10:02", "Succes", "Gebruiker ingelogd", "1, admin (Beheerder)"],
        ["23", "11 mrt 10:02", "Succes", "Gebruiker uitgelogd", "1, admin (Beheerder)"],
        ["22", "11 mrt 10:02", "Succes", "Gebruiker ingelogd", "1, admin (Beheerder)"],
        ["21", "11 mrt 10:02", "Succes", "Gebruiker uitgelogd", "2, typist (Invoerder)"],
        ["20", "11 mrt 10:02", "Succes", "Gebruiker ingelogd", "2, typist (Invoerder)"],
        ["19", "11 mrt 10:02", "Succes", "Gebruiker uitgelogd", "3, coordinator (Coördinator)"],
        ["18", "11 mrt 10:02", "Succes", "Gebruiker ingelogd", "3, coordinator (Coördinator)"],
        ["17", "11 mrt 10:02", "Succes", "Gebruiker uitgelogd", "3, coordinator (Coördinator)"],
      ]);
    });

    const filterLog = spyOnHandler(LogRequestHandler);

    const user = userEvent.setup();
    const nextButton = (await screen.findAllByRole("button", { name: "Volgende" }))[0] as HTMLButtonElement;
    await user.click(nextButton);

    expect(filterLog).toHaveBeenCalledExactlyOnceWith(null, new URLSearchParams({ page: "2" }));
  });

  test("Show audit log event details", async () => {
    render(<LogsHomePage />);

    const table = await screen.findByRole("table");
    expect(table).toBeVisible();

    const user = userEvent.setup();
    const firstRow = (await screen.findAllByRole("row"))[1] as HTMLTableRowElement;
    await user.click(firstRow);

    const list = (await screen.findAllByRole("list"))[0] as HTMLDataListElement;
    expect(list).toBeVisible();

    expect(list).toHaveTextContent(
      [
        "Tijdstip",
        "11 maart 2025 om 10:02",
        "Gebruikersnaam",
        "admin",
        "Volledige naam",
        "Sanne Molenaar",
        "Rol",
        "Beheerder",
        "Gebruikers-ID",
        "1",
        "Toelichting",
        "-",
        "IP-adres",
        "127.0.0.1",
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

    expect(table).toHaveTableContent([
      ["Nummer", "Tijdstip", "Type", "Gebeurtenis", "Gebruiker: id, gebruikersnaam (rol)"],
      ["24", "11 mrt 10:02", "Succes", "Gebruiker ingelogd", "1, admin (Beheerder)"],
      ["23", "11 mrt 10:02", "Succes", "Gebruiker uitgelogd", "1, admin (Beheerder)"],
      ["22", "11 mrt 10:02", "Succes", "Gebruiker ingelogd", "1, admin (Beheerder)"],
      ["21", "11 mrt 10:02", "Succes", "Gebruiker uitgelogd", "2, typist (Invoerder)"],
      ["20", "11 mrt 10:02", "Succes", "Gebruiker ingelogd", "2, typist (Invoerder)"],
      ["19", "11 mrt 10:02", "Succes", "Gebruiker uitgelogd", "3, coordinator (Coördinator)"],
      ["18", "11 mrt 10:02", "Succes", "Gebruiker ingelogd", "3, coordinator (Coördinator)"],
      ["17", "11 mrt 10:02", "Succes", "Gebruiker uitgelogd", "3, coordinator (Coördinator)"],
    ]);

    const filterButton = await screen.findByRole("button", { name: "Filteren" });
    await userEvent.click(filterButton);

    await waitFor(() => {
      // a event option
      expect(screen.getByTestId("event-UserLoggedIn")).toBeInTheDocument();
    });

    const filterLog = spyOnHandler(LogRequestHandler);

    const eventOption = await screen.findByTestId("event-UserLoggedIn");
    await userEvent.click(eventOption);

    const params = new URLSearchParams({ event: "UserLoggedIn" });

    expect(filterLog).toHaveBeenCalledExactlyOnceWith(null, params);
    filterLog.mockClear();

    const levelOption = await screen.findByTestId("level-success");
    await userEvent.click(levelOption);

    params.append("level", "success");

    expect(filterLog).toHaveBeenCalledExactlyOnceWith(null, params);
    filterLog.mockClear();

    const userOption1 = await screen.findByTestId("user-1");
    await userEvent.click(userOption1);

    params.append("user", "1");

    expect(filterLog).toHaveBeenCalledExactlyOnceWith(null, params);
    filterLog.mockClear();

    const userOption2 = await screen.findByTestId("user-2");
    await userEvent.click(userOption2);

    params.append("user", "2");

    expect(filterLog).toHaveBeenCalledExactlyOnceWith(null, params);
    filterLog.mockClear();

    const since = await screen.findByLabelText("Sinds");
    await userEvent.type(since, "2025-03-11T10:00");

    params.append("since", "1741683600");

    expect(filterLog).toHaveBeenCalledExactlyOnceWith(null, params);
    filterLog.mockClear();

    const clearButton = await screen.findByRole("button", { name: "Filter sluiten" });
    await userEvent.click(clearButton);
  });
});

import * as ReactRouter from "react-router";

import { beforeEach, describe, expect, test, vi } from "vitest";

import { UsersProvider } from "@/hooks/user/UsersProvider";
import { committeeSessionMockData } from "@/testing/api-mocks/CommitteeSessionMockData";
import { electionMockData } from "@/testing/api-mocks/ElectionMockData";
import { pollingStationMockData } from "@/testing/api-mocks/PollingStationMockData";
import { UserListRequestHandler } from "@/testing/api-mocks/RequestHandlers";
import { server } from "@/testing/server";
import { render, screen, within } from "@/testing/test-utils";
import { ElectionStatusResponseEntry } from "@/types/generated/openapi";

import { ElectionStatus } from "./ElectionStatus";

const navigate = vi.fn();
describe("ElectionStatus", () => {
  beforeEach(() => {
    vi.spyOn(ReactRouter, "useNavigate").mockImplementation(() => navigate);
    server.use(UserListRequestHandler);
  });

  test.each([true, false])("Click on 'Fouten en waarschuwingen' table rows with links", async (addLinks) => {
    const statuses: ElectionStatusResponseEntry[] = [
      {
        polling_station_id: 4,
        status: "first_entry_has_errors",
        first_entry_user_id: 1,
        first_entry_progress: 100,
      },
      {
        polling_station_id: 7,
        status: "entries_different",
        first_entry_user_id: 1,
        second_entry_user_id: 2,
        first_entry_progress: 100,
        second_entry_progress: 100,
      },
    ];
    const tablesRoot = await renderStatusTable(statuses, addLinks);
    expect(within(tablesRoot).getByRole("heading", { level: 3, name: "Fouten en waarschuwingen (2)" })).toBeVisible();

    const table = within(tablesRoot).getByRole("table", { name: "Fouten en waarschuwingen" });
    expect(table).toHaveTableContent([
      ["Nummer", "Stembureau", "Te controleren"],
      ["36", "Testbuurthuis 1e invoer", "Fouten in proces-verbaal"],
      ["39", "Test gemeentehuis 2e invoer", "Verschil 1e en 2e invoer"],
    ]);
    const tableRows = within(table).getAllByRole("row");

    if (addLinks) {
      // Click on row of polling station with data entry with errors
      tableRows[1]!.click();
      expect(navigate).toHaveBeenCalledWith("./4/detail");
      // Click on row of polling station with data entries with differences
      tableRows[2]!.click();
      expect(navigate).toHaveBeenCalledWith("./7/resolve-differences");
    } else {
      tableRows[1]!.click();
      tableRows[2]!.click();

      expect(navigate).not.toHaveBeenCalled();
    }
  });

  test.each([true, false])("Click on 'Invoer bezig' table rows with links", async (addLinks) => {
    const statuses: ElectionStatusResponseEntry[] = [
      {
        polling_station_id: 3,
        status: "first_entry_in_progress",
        first_entry_user_id: 1,
        first_entry_progress: 20,
      },
      {
        polling_station_id: 6,
        status: "second_entry_in_progress",
        first_entry_user_id: 1,
        second_entry_user_id: 2,
        first_entry_progress: 100,
        second_entry_progress: 30,
      },
    ];
    const tablesRoot = await renderStatusTable(statuses, addLinks);

    expect(within(tablesRoot).getByRole("heading", { level: 3, name: "Invoer bezig (2)" })).toBeVisible();

    const table = within(tablesRoot).getByRole("table", { name: "Invoer bezig" });
    expect(table).toHaveTableContent([
      ["Nummer", "Stembureau", "Invoerder", "Voortgang"],
      ["35", "Testschool 1e invoer", "Sanne Molenaar", "20%"],
      ["38", "Testmuseum 2e invoer", "Jayden Ahmen", "30%"],
    ]);
    const tableRows = within(table).getAllByRole("row");

    if (addLinks) {
      // Click on row of polling station with data entry
      tableRows[1]!.click();
      expect(navigate).toHaveBeenCalledWith("./3/detail");
      // Click on row of polling station with data entry
      tableRows[2]!.click();
      expect(navigate).toHaveBeenCalledWith("./6/detail");
    } else {
      tableRows[1]!.click();
      tableRows[2]!.click();

      expect(navigate).not.toHaveBeenCalled();
    }
  });

  test.each([true, false])("Click on 'Eerste invoer klaar' table rows with links", async (addLinks) => {
    const today = new Date();
    today.setHours(10, 20);

    const statuses: ElectionStatusResponseEntry[] = [
      {
        polling_station_id: 5,
        status: "second_entry_not_started",
        finished_at: today.toISOString(),
        first_entry_user_id: 1,
        first_entry_progress: 100,
      },
    ];
    const tablesRoot = await renderStatusTable(statuses, addLinks);
    expect(within(tablesRoot).getByRole("heading", { level: 3, name: "Eerste invoer klaar (1)" })).toBeVisible();

    const table = within(tablesRoot).getByRole("table", { name: "Eerste invoer klaar" });
    expect(table).toHaveTableContent([
      ["Nummer", "Stembureau", "Invoerder", "Afgerond op"],
      ["37", "Dansschool Oeps nou deed ik het weer", "Sanne Molenaar", "vandaag 10:20"],
    ]);
    const tableRows = within(table).getAllByRole("row");

    if (addLinks) {
      // Click on row of polling station with data entry
      tableRows[1]!.click();
      expect(navigate).toHaveBeenCalledWith("./5/detail");
    } else {
      tableRows[1]!.click();

      expect(navigate).not.toHaveBeenCalled();
    }
  });

  test.each([true, false])("Click on 'Eerste en tweede invoer klaar' table rows with links", async (addLinks) => {
    const today = new Date();
    today.setHours(10, 20);

    const statuses: ElectionStatusResponseEntry[] = [
      {
        polling_station_id: 8,
        status: "definitive",
        first_entry_user_id: 1,
        first_entry_progress: 100,
        second_entry_user_id: 2,
        second_entry_progress: 100,
        finished_at: today.toISOString(),
      },
    ];

    const tablesRoot = await renderStatusTable(statuses, addLinks);

    expect(
      within(tablesRoot).getByRole("heading", { level: 3, name: "Eerste en tweede invoer klaar (1)" }),
    ).toBeVisible();

    const table = within(tablesRoot).getByRole("table", { name: "Eerste en tweede invoer klaar" });
    expect(table).toHaveTableContent([
      ["Nummer", "Stembureau", "Afgerond op"],
      ["40", "Test kerk", "vandaag 10:20"],
    ]);
    const tableRows = within(table).getAllByRole("row");

    if (addLinks) {
      // Click on row of polling station with data entry
      tableRows[1]!.click();
      expect(navigate).toHaveBeenCalledWith("./8/detail");
    } else {
      tableRows[1]!.click();

      expect(navigate).not.toHaveBeenCalled();
    }
  });

  test.each([true, false])("Click on 'Werkvoorraad' table rows with links", async (addLinks) => {
    const today = new Date();
    today.setHours(10, 20);

    const statuses: ElectionStatusResponseEntry[] = [
      {
        polling_station_id: 2,
        status: "first_entry_not_started",
      },
    ];

    const tablesRoot = await renderStatusTable(statuses, addLinks);

    expect(within(tablesRoot).getByRole("heading", { level: 3, name: "Werkvoorraad (1)" })).toBeVisible();

    const table = within(tablesRoot).getByRole("table", { name: "Werkvoorraad" });
    expect(table).toHaveTableContent([
      ["Nummer", "Stembureau"],
      ["34", "Testplek"],
    ]);
    const tableRows = within(table).getAllByRole("row");

    if (addLinks) {
      // Click on row of polling station without a link
      tableRows[1]!.click();
      expect(navigate).not.toHaveBeenCalledWith("./8/detail");
    } else {
      tableRows[1]!.click();

      expect(navigate).not.toHaveBeenCalled();
    }
  });

  async function renderStatusTable(statuses: ElectionStatusResponseEntry[], addLinks: boolean) {
    render(
      <UsersProvider>
        <ElectionStatus
          statuses={statuses}
          election={electionMockData}
          committeeSession={committeeSessionMockData}
          pollingStations={pollingStationMockData}
          addLinks={addLinks}
          navigate={navigate}
        />
      </UsersProvider>,
    );

    expect(await screen.findByRole("heading", { level: 2, name: "Statusoverzicht steminvoer" })).toBeVisible();
    expect(await screen.findByRole("heading", { level: 3, name: "Stembureaus per status" })).toBeVisible();

    return screen.getByRole("article");
  }
});

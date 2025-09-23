import * as ReactRouter from "react-router";

import { beforeEach, describe, expect, test, vi } from "vitest";

import { UsersProvider } from "@/hooks/user/UsersProvider";
import { committeeSessionMockData } from "@/testing/api-mocks/CommitteeSessionMockData";
import { electionMockData } from "@/testing/api-mocks/ElectionMockData";
import { pollingStationMockData } from "@/testing/api-mocks/PollingStationMockData";
import { UserListRequestHandler } from "@/testing/api-mocks/RequestHandlers";
import { server } from "@/testing/server";
import { render, screen, within } from "@/testing/test-utils";

import { ElectionStatus } from "./ElectionStatus";

const navigate = vi.fn();
describe("ElectionStatus", () => {
  beforeEach(() => {
    vi.spyOn(ReactRouter, "useNavigate").mockImplementation(() => navigate);
    server.use(UserListRequestHandler);
  });

  test.each([true, false])("Click on table rows with/without links", async (addLinks) => {
    render(
      <UsersProvider>
        <ElectionStatus
          statuses={[
            {
              polling_station_id: 7,
              status: "entries_different",
              first_entry_user_id: 1,
              second_entry_user_id: 2,
              first_entry_progress: 100,
              second_entry_progress: 100,
            },
            {
              polling_station_id: 8,
              status: "first_entry_has_errors",
              first_entry_user_id: 1,
              first_entry_progress: 100,
            },
          ]}
          election={electionMockData}
          committeeSession={committeeSessionMockData}
          pollingStations={pollingStationMockData}
          addLinks={addLinks}
          navigate={navigate}
        />
      </UsersProvider>,
    );

    expect(await screen.findByRole("heading", { level: 2, name: "Statusoverzicht steminvoer" })).toBeVisible();

    const tablesRoot = screen.getByRole("article");
    expect(within(tablesRoot).getByRole("heading", { level: 3, name: "Fouten en waarschuwingen (2)" })).toBeVisible();

    const table = within(tablesRoot).getByRole("table");
    expect(table).toHaveTableContent([
      ["Nummer", "Stembureau", "Te controleren"],
      ["39", "Test gemeentehuis 2e invoer", "Verschil 1e en 2e invoer"],
      ["40", "Test kerk 1e invoer", "Fouten in proces-verbaal"],
    ]);
    const errorsAndWarningsRows = within(table).getAllByRole("row");

    if (addLinks) {
      // Click on row of polling station with data entries with differences
      errorsAndWarningsRows[1]!.click();
      expect(navigate).toHaveBeenCalledWith("./7/resolve-differences");
      // Click on row of polling station with data entry with errors
      errorsAndWarningsRows[2]!.click();
      expect(navigate).toHaveBeenCalledWith("./8/resolve-errors");
    } else {
      errorsAndWarningsRows[1]!.click();
      errorsAndWarningsRows[2]!.click();

      expect(navigate).not.toHaveBeenCalled();
    }
  });
});

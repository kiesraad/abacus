import { screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import { PollingStationListPage } from "app/module/polling_stations";
import { overrideOnce, render } from "app/test/unit";

import { PollingStationListProvider, PollingStationListResponse } from "@kiesraad/api";

describe("PollingStationListPage", () => {
  test("Show polling stations", async () => {
    render(
      <PollingStationListProvider electionId={1}>
        <PollingStationListPage />
      </PollingStationListProvider>,
    );

    expect(await screen.findByRole("table")).toBeVisible();

    const rows = screen.getAllByRole("row");
    expect(rows.length).toBe(3);

    expect(rows[0]).toHaveTextContent(/Nummer/);
    expect(rows[0]).toHaveTextContent(/Naam/);
    expect(rows[0]).toHaveTextContent(/Soort/);

    expect(rows[1]).toHaveTextContent(/33/);
    expect(rows[1]).toHaveTextContent(/Op Rolletjes/);
    expect(rows[1]).toHaveTextContent(/Mobiel/);

    expect(rows[2]).toHaveTextContent(/34/);
    expect(rows[2]).toHaveTextContent(/Testplek/);
    expect(rows[2]).toHaveTextContent(/Bijzonder/);
  });

  test("Show no polling stations message", async () => {
    overrideOnce("get", "/api/elections/42/polling_stations", 200, {
      polling_stations: [],
    } satisfies PollingStationListResponse);

    render(
      <PollingStationListProvider electionId={42}>
        <PollingStationListPage />
      </PollingStationListProvider>,
    );

    expect(await screen.findByTestId("no-polling-station-data")).toBeVisible();
    expect(screen.queryByRole("table")).toBeNull();
  });
});

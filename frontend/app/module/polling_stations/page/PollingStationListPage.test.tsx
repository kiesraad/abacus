import * as Router from "react-router";

import { screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import { PollingStationListPage } from "app/module/polling_stations";
import { overrideOnce, render } from "app/test/unit";

import { PollingStationListResponse } from "@kiesraad/api";

describe("PollingStationListPage", () => {
  test("Show polling stations", async () => {
    vi.spyOn(Router, "useParams").mockReturnValue({ electionId: "1" });

    render(<PollingStationListPage />);

    expect(await screen.findByRole("table")).toBeVisible();

    const rows = screen.getAllByRole("row");
    expect(rows.length).toBe(5);

    expect(rows[0]).toHaveTextContent(/Nummer/);
    expect(rows[0]).toHaveTextContent(/Naam/);
    expect(rows[0]).toHaveTextContent(/Soort/);

    expect(rows[1]).toHaveTextContent(/33/);
    expect(rows[1]).toHaveTextContent(/Op Rolletjes/);
    expect(rows[1]).toHaveTextContent(/Mobiel/);

    expect(rows[2]).toHaveTextContent(/34/);
    expect(rows[2]).toHaveTextContent(/Testplek/);
    expect(rows[2]).toHaveTextContent(/Bijzonder/);

    expect(rows[3]).toHaveTextContent(/35/);
    expect(rows[3]).toHaveTextContent(/Testschool/);
    expect(rows[3]).toHaveTextContent(/Vaste locatie/);

    expect(rows[4]).toHaveTextContent(/36/);
    expect(rows[4]).toHaveTextContent(/Testbuurthuis/);
    expect(rows[4]).toHaveTextContent(/Vaste locatie/);
  });

  test("Show no polling stations message", async () => {
    overrideOnce("get", "/api/elections/42/polling_stations", 200, {
      polling_stations: [],
    } satisfies PollingStationListResponse);

    vi.spyOn(Router, "useParams").mockReturnValue({ electionId: "42" });

    render(<PollingStationListPage />);

    expect(await screen.findByText(/Er zijn nog geen stembureaus ingevoerd/)).toBeVisible();
    expect(screen.queryByRole("table")).toBeNull();
  });
});

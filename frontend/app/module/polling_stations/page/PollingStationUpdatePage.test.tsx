import * as Router from "react-router";

import { screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import { overrideOnce, render } from "app/test/unit";

import { PollingStation } from "@kiesraad/api";

import { PollingStationUpdatePage } from "./PollingStationUpdatePage";

describe("PollingStationCreatePage", () => {
  test("Shows form", async () => {
    vi.spyOn(Router, "useParams").mockReturnValue({ electionId: "1", pollingStationId: "1" });

    const testPollingStation: PollingStation = {
      id: 1,
      election_id: 1,
      number: 1,
      name: "test",
      street: "test",
      postal_code: "1234",
      locality: "test",
      polling_station_type: "FixedLocation",
      number_of_voters: 1,
      house_number: "test",
    };

    overrideOnce(
      "get",
      `/api/polling_stations/${testPollingStation.id}`,
      200,
      testPollingStation satisfies PollingStation,
    );

    render(<PollingStationUpdatePage />);

    expect(await screen.findByTestId("polling-station-form")).toBeVisible();

    expect(screen.getByTestId("number")).toHaveValue("1");
    expect(screen.getByTestId("name")).toHaveValue("test");
  });
});

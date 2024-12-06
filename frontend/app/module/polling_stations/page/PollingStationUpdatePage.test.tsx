import * as Router from "react-router";

import { screen, waitFor } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import { overrideOnce, render } from "app/test/unit";

import { ElectionProvider, PollingStation } from "@kiesraad/api";

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

    render(
      <ElectionProvider electionId={1}>
        <PollingStationUpdatePage />
      </ElectionProvider>,
    );

    const form = await screen.findByTestId("polling-station-form");
    expect(form).toBeVisible();

    expect(screen.getByRole("textbox", { name: "Nummer" })).toHaveValue("1");
    expect(screen.getByRole("textbox", { name: "Naam" })).toHaveValue("test");
  });

  test("Navigates back on save", async () => {
    vi.spyOn(Router, "useParams").mockReturnValue({ electionId: "1", pollingStationId: "1" });
    const navigate = vi.fn();
    vi.spyOn(Router, "useNavigate").mockReturnValue(navigate);

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

    render(
      <ElectionProvider electionId={1}>
        <PollingStationUpdatePage />
      </ElectionProvider>,
    );

    const saveButton = await screen.findByRole("button", { name: "Wijzigingen opslaan" });
    saveButton.click();

    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith("../?updated=1");
    });
  });
});

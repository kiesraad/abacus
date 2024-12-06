import * as Router from "react-router";

import { within } from "@testing-library/dom";
import { screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";

import { overrideOnce, render, server } from "app/test/unit";

import { PollingStation } from "@kiesraad/api";

import { PollingStationUpdatePage } from "./PollingStationUpdatePage";

describe("PollingStationCreatePage", () => {
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

  test("Shows form", async () => {
    vi.spyOn(Router, "useParams").mockReturnValue({ electionId: "1", pollingStationId: "1" });

    overrideOnce("get", `/api/polling_stations/${testPollingStation.id}`, 200, testPollingStation);

    render(<PollingStationUpdatePage />);

    const form = await screen.findByTestId("polling-station-form");
    expect(form).toBeVisible();

    expect(screen.getByRole("textbox", { name: "Nummer" })).toHaveValue("1");
    expect(screen.getByRole("textbox", { name: "Naam" })).toHaveValue("test");
  });

  test("Navigates back on save", async () => {
    vi.spyOn(Router, "useParams").mockReturnValue({ electionId: "1", pollingStationId: "1" });
    const navigate = vi.fn();
    vi.spyOn(Router, "useNavigate").mockReturnValue(navigate);

    overrideOnce("get", `/api/polling_stations/${testPollingStation.id}`, 200, testPollingStation);

    render(<PollingStationUpdatePage />);

    const saveButton = await screen.findByRole("button", { name: "Wijzigingen opslaan" });
    saveButton.click();

    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith("../?updated=1");
    });
  });

  describe("Delete polling station", () => {
    test("Returns to list page with a message", async () => {
      const user = userEvent.setup();

      vi.spyOn(Router, "useParams").mockReturnValue({ electionId: "1", pollingStationId: "1" });
      const navigate = vi.fn();
      vi.spyOn(Router, "useNavigate").mockReturnValue(navigate);

      overrideOnce("get", `/api/polling_stations/${testPollingStation.id}`, 200, testPollingStation);

      render(<PollingStationUpdatePage />);

      const deleteButton = await screen.findByRole("button", { name: "Stembureau verwijderen" });
      await user.click(deleteButton);

      const modal = await screen.findByTestId("modal-dialog");
      expect(modal).toHaveTextContent("Stembureau verwijderen");

      let request_method: string;
      let request_url: string;

      overrideOnce("delete", `/api/polling_stations/${testPollingStation.id}`, 200, "");
      server.events.on("request:start", ({ request }) => {
        request_method = request.method;
        request_url = request.url;
      });

      const confirmButton = await within(modal).findByRole("button", { name: "Verwijderen" });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(request_method).toEqual("DELETE");
        expect(request_url).toContain(`/api/polling_stations/${testPollingStation.id}`);
      });

      await waitFor(() => {
        expect(navigate).toHaveBeenCalledWith("../?deleted=1%20(test)");
      });
    });

    test("Shows an error message when delete was not possible", async () => {
      const user = userEvent.setup();

      vi.spyOn(Router, "useParams").mockReturnValue({ electionId: "1", pollingStationId: "1" });
      const navigate = vi.fn();
      vi.spyOn(Router, "useNavigate").mockReturnValue(navigate);

      overrideOnce("get", `/api/polling_stations/${testPollingStation.id}`, 200, testPollingStation);
      overrideOnce("delete", `/api/polling_stations/${testPollingStation.id}`, 422, {
        error: "Invalid data",
        fatal: false,
        reference: "InvalidData",
      });

      render(<PollingStationUpdatePage />);

      const deleteButton = await screen.findByRole("button", { name: "Stembureau verwijderen" });
      await user.click(deleteButton);

      const modal = await screen.findByTestId("modal-dialog");
      expect(modal).toHaveTextContent("Stembureau verwijderen");

      const confirmButton = await within(modal).findByRole("button", { name: "Verwijderen" });
      await user.click(confirmButton);

      expect(await screen.findByRole("alert")).toHaveTextContent("Het stembureau kan niet meer verwijderd worden.");
    });
  });
});

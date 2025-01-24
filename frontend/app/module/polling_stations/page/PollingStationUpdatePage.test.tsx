import { within } from "@testing-library/dom";
import { screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { ElectionProvider, PollingStation } from "@kiesraad/api";
import { ElectionRequestHandler, PollingStationUpdateHandler } from "@kiesraad/api-mocks";
import { overrideOnce, render, renderReturningRouter, server } from "@kiesraad/test";

import { PollingStationUpdatePage } from "./PollingStationUpdatePage";

vi.mock(import("@kiesraad/util"), async (importOriginal) => ({
  ...(await importOriginal()),
  useNumericParam: () => 1,
}));

describe("PollingStationUpdatePage", () => {
  const testPollingStation: PollingStation = {
    id: 1,
    election_id: 1,
    number: 1,
    name: "test",
    address: "test",
    postal_code: "1234",
    locality: "test",
    polling_station_type: "FixedLocation",
    number_of_voters: 1,
  };

  beforeEach(() => {
    server.use(ElectionRequestHandler, PollingStationUpdateHandler);
  });

  test("Shows form", async () => {
    overrideOnce(
      "get",
      `/api/elections/${testPollingStation.election_id}/polling_stations/${testPollingStation.id}`,
      200,
      testPollingStation,
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
    overrideOnce(
      "get",
      `/api/elections/${testPollingStation.election_id}/polling_stations/${testPollingStation.id}`,
      200,
      testPollingStation,
    );

    const router = renderReturningRouter(
      <ElectionProvider electionId={1}>
        <PollingStationUpdatePage />
      </ElectionProvider>,
    );

    const saveButton = await screen.findByRole("button", { name: "Wijzigingen opslaan" });
    saveButton.click();

    await waitFor(() => {
      expect(router.state.location.pathname).toEqual("/elections/1/polling-stations");
      expect(router.state.location.search).toEqual("?updated=1");
    });
  });

  describe("Delete polling station", () => {
    test("Returns to list page with a message", async () => {
      const user = userEvent.setup();

      overrideOnce(
        "get",
        `/api/elections/${testPollingStation.election_id}/polling_stations/${testPollingStation.id}`,
        200,
        testPollingStation,
      );

      const router = renderReturningRouter(
        <ElectionProvider electionId={1}>
          <PollingStationUpdatePage />
        </ElectionProvider>,
      );

      const deleteButton = await screen.findByRole("button", { name: "Stembureau verwijderen" });
      await user.click(deleteButton);

      const modal = await screen.findByTestId("modal-dialog");
      expect(modal).toHaveTextContent("Stembureau verwijderen");

      let request_method: string;
      let request_url: string;

      overrideOnce(
        "delete",
        `/api/elections/${testPollingStation.election_id}/polling_stations/${testPollingStation.id}`,
        200,
        "",
      );

      server.events.on("request:start", ({ request }) => {
        request_method = request.method;
        request_url = request.url;
      });

      const confirmButton = await within(modal).findByRole("button", { name: "Verwijderen" });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(request_method).toEqual("DELETE");
        expect(request_url).toContain(
          `/api/elections/${testPollingStation.election_id}/polling_stations/${testPollingStation.id}`,
        );
      });

      expect(router.state.location.pathname).toEqual("/elections/1/polling-stations");
      expect(router.state.location.search).toEqual("?deleted=1%20(test)");
    });

    test("Shows an error message when delete was not possible", async () => {
      const user = userEvent.setup();

      const url = `/api/elections/${testPollingStation.election_id}/polling_stations/${testPollingStation.id}`;
      overrideOnce("get", url, 200, testPollingStation);
      overrideOnce("delete", url, 422, {
        error: "Invalid data",
        fatal: false,
        reference: "InvalidData",
      });

      render(
        <ElectionProvider electionId={1}>
          <PollingStationUpdatePage />
        </ElectionProvider>,
      );

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

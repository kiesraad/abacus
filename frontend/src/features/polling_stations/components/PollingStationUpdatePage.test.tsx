import { userEvent } from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { ElectionProvider, PollingStation } from "@/api";
import {
  ElectionRequestHandler,
  PollingStationDeleteHandler,
  PollingStationGetHandler,
  PollingStationUpdateHandler,
} from "@/testing/api-mocks/RequestHandlers";
import { overrideOnce, server } from "@/testing/server";
import { render, renderReturningRouter, screen, spyOnHandler, waitFor, within } from "@/testing/test-utils";

import { PollingStationUpdatePage } from "./PollingStationUpdatePage";

vi.mock(import("@/hooks/useNumericParam"), () => ({
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
    server.use(ElectionRequestHandler, PollingStationGetHandler, PollingStationUpdateHandler);
  });

  test("Shows form", async () => {
    render(
      <ElectionProvider electionId={1}>
        <PollingStationUpdatePage />
      </ElectionProvider>,
    );

    const form = await screen.findByTestId("polling-station-form");
    expect(form).toBeVisible();

    expect(screen.getByRole("textbox", { name: "Nummer" })).toHaveValue("33");
    expect(screen.getByRole("textbox", { name: "Naam" })).toHaveValue("Op Rolletjes");
  });

  test("Navigates back on save", async () => {
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
      server.use(PollingStationDeleteHandler);
      const user = userEvent.setup();

      const router = renderReturningRouter(
        <ElectionProvider electionId={1}>
          <PollingStationUpdatePage />
        </ElectionProvider>,
      );

      const deleteButton = await screen.findByRole("button", { name: "Stembureau verwijderen" });
      await user.click(deleteButton);

      const modal = await screen.findByTestId("modal-dialog");
      expect(modal).toHaveTextContent("Stembureau verwijderen");

      const deletePollingStation = spyOnHandler(PollingStationDeleteHandler);

      const confirmButton = await within(modal).findByRole("button", { name: "Verwijderen" });
      await user.click(confirmButton);

      expect(deletePollingStation).toHaveBeenCalled();

      expect(router.state.location.pathname).toEqual("/elections/1/polling-stations");
      expect(router.state.location.search).toEqual("?deleted=33%20(Op%20Rolletjes)");
    });

    test("Shows an error message when delete was not possible", async () => {
      const user = userEvent.setup();

      const url = `/api/elections/${testPollingStation.election_id}/polling_stations/${testPollingStation.id}`;
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

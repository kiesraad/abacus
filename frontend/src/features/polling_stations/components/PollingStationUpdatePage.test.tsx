import * as ReactRouter from "react-router";

import { userEvent } from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";

import * as useMessages from "@/hooks/messages/useMessages";
import { ElectionProvider } from "@/hooks/election/ElectionProvider";
import {
  ElectionRequestHandler,
  PollingStationDeleteHandler,
  PollingStationGetHandler,
  PollingStationUpdateHandler,
} from "@/testing/api-mocks/RequestHandlers";
import { overrideOnce, server } from "@/testing/server";
import { render, renderReturningRouter, screen, spyOnHandler, waitFor, within } from "@/testing/test-utils";
import { PollingStation } from "@/types/generated/openapi";

import { PollingStationUpdatePage } from "./PollingStationUpdatePage";

describe("PollingStationUpdatePage", () => {
  const testPollingStation: PollingStation = {
    id: 1,
    election_id: 1,
    committee_session_id: 1,
    number: 1,
    name: "test",
    address: "test",
    postal_code: "1234",
    locality: "test",
    polling_station_type: "FixedLocation",
    number_of_voters: 1,
  };

  const pushMessage = vi.fn();

  beforeEach(() => {
    server.use(ElectionRequestHandler, PollingStationGetHandler, PollingStationUpdateHandler);
    vi.spyOn(ReactRouter, "useParams").mockReturnValue({ pollingStationId: "1" });
    vi.spyOn(useMessages, "useMessages").mockReturnValue({
      pushMessage,
      popMessages: vi.fn(() => []),
      hasMessages: vi.fn(() => false),
    });
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
      expect(pushMessage).toHaveBeenCalledWith({ title: "Wijzigingen stembureau 34 (Testplek) opgeslagen" });
      expect(router.state.location.pathname).toEqual("/elections/1/polling-stations");
    });
  });

  describe("Delete polling station", () => {
    test("Delete button should be shown", async () => {
      render(
        <ElectionProvider electionId={1}>
          <PollingStationUpdatePage />
        </ElectionProvider>,
      );

      const deleteButton = await screen.findByRole("button", { name: "Stembureau verwijderen" });
      expect(deleteButton).toBeInTheDocument();
    });

    test("Delete button should be disabled when polling station is linked to previous session", async () => {
      overrideOnce("get", "/api/elections/1/polling_stations/1", 200, {
        ...testPollingStation,
        id_prev_session: 42,
      });

      render(
        <ElectionProvider electionId={1}>
          <PollingStationUpdatePage />
        </ElectionProvider>,
      );

      // Button should not be shown
      const deleteButton = screen.queryByRole("button", { name: "Stembureau verwijderen" });
      expect(deleteButton).not.toBeInTheDocument();

      // Should have text explaining why
      expect(await screen.findByText("Stembureau verwijderen niet mogelijk")).toBeVisible();
      expect(await screen.findByText("Er zijn al tellingen ingevoerd.")).toBeVisible();
    });

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
      expect(modal).toHaveTextContent("Stembureau verwijderen?");

      const deletePollingStation = spyOnHandler(PollingStationDeleteHandler);

      const confirmButton = await within(modal).findByRole("button", { name: "Verwijderen" });
      await user.click(confirmButton);

      expect(deletePollingStation).toHaveBeenCalled();

      expect(pushMessage).toHaveBeenCalledWith({ title: "Stembureau 33 (Op Rolletjes) verwijderd" });
      expect(router.state.location.pathname).toEqual("/elections/1/polling-stations");
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
      expect(modal).toHaveTextContent("Stembureau verwijderen?");

      const confirmButton = await within(modal).findByRole("button", { name: "Verwijderen" });
      await user.click(confirmButton);

      const deleteAlert = await screen.findByRole("alert");
      expect(within(deleteAlert).getByRole("strong")).toHaveTextContent("Stembureau kan niet verwijderd worden");
      expect(within(deleteAlert).getByRole("paragraph")).toHaveTextContent(
        "Het stembureau kan niet meer verwijderd worden.",
      );
    });
  });
});

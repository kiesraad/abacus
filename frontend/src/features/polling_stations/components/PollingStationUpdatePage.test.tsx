import * as ReactRouter from "react-router";

import { userEvent } from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";

import * as useMessages from "@/hooks/messages/useMessages";
import { ElectionProvider } from "@/hooks/election/ElectionProvider";
import { getElectionMockData } from "@/testing/api-mocks/ElectionMockData";
import {
  ElectionRequestHandler,
  PollingStationDeleteHandler,
  PollingStationGetHandler,
  PollingStationUpdateHandler,
} from "@/testing/api-mocks/RequestHandlers";
import { overrideOnce, server } from "@/testing/server";
import { render, screen, spyOnHandler, waitFor, within } from "@/testing/test-utils";
import { TestUserProvider } from "@/testing/TestUserProvider";
import { CommitteeSessionStatus, PollingStation, Role } from "@/types/generated/openapi";

import { PollingStationUpdatePage } from "./PollingStationUpdatePage";

const navigate = vi.fn();

function renderPage(userRole: Role) {
  return render(
    <TestUserProvider userRole={userRole}>
      <ElectionProvider electionId={1}>
        <PollingStationUpdatePage />
      </ElectionProvider>
    </TestUserProvider>,
  );
}

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
    vi.spyOn(ReactRouter, "useNavigate").mockImplementation(() => navigate);
    vi.spyOn(ReactRouter, "Navigate").mockImplementation((props) => {
      navigate(props.to);
      return null;
    });
    vi.spyOn(ReactRouter, "useParams").mockReturnValue({ pollingStationId: "1" });
    vi.spyOn(useMessages, "useMessages").mockReturnValue({
      pushMessage,
      popMessages: vi.fn(() => []),
      hasMessages: vi.fn(() => false),
    });
  });

  test("Shows form", async () => {
    renderPage("coordinator");

    expect(await screen.findByTestId("polling-station-form")).toBeVisible();
    expect(screen.getByRole("textbox", { name: "Nummer" })).toHaveValue("33");
    expect(screen.getByRole("textbox", { name: "Naam" })).toHaveValue("Op Rolletjes");
  });

  test("Navigates back on save", async () => {
    renderPage("coordinator");

    expect(await screen.findByTestId("polling-station-form")).toBeVisible();
    const saveButton = await screen.findByRole("button", { name: "Wijzigingen opslaan" });
    saveButton.click();

    await waitFor(() => {
      expect(pushMessage).toHaveBeenCalledWith({ title: "Wijzigingen stembureau 34 (Testplek) opgeslagen" });
      expect(navigate).toHaveBeenCalledExactlyOnceWith("/elections/1/polling-stations");
    });
  });

  describe("Delete polling station", () => {
    test("Delete button should be shown", async () => {
      renderPage("coordinator");

      expect(await screen.findByTestId("polling-station-form")).toBeVisible();
      const deleteButton = await screen.findByRole("button", { name: "Stembureau verwijderen" });
      expect(deleteButton).toBeInTheDocument();
    });

    test("Delete button should be disabled when polling station is linked to previous session", async () => {
      overrideOnce("get", "/api/elections/1/polling_stations/1", 200, {
        ...testPollingStation,
        id_prev_session: 42,
      });

      renderPage("coordinator");

      expect(await screen.findByTestId("polling-station-form")).toBeVisible();
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

      renderPage("coordinator");

      expect(await screen.findByTestId("polling-station-form")).toBeVisible();
      const deleteButton = await screen.findByRole("button", { name: "Stembureau verwijderen" });
      await user.click(deleteButton);

      const modal = await screen.findByTestId("modal-dialog");
      expect(modal).toHaveTextContent("Stembureau verwijderen?");

      const deletePollingStation = spyOnHandler(PollingStationDeleteHandler);

      const confirmButton = await within(modal).findByRole("button", { name: "Verwijderen" });
      await user.click(confirmButton);

      expect(deletePollingStation).toHaveBeenCalled();

      expect(pushMessage).toHaveBeenCalledWith({ title: "Stembureau 33 (Op Rolletjes) verwijderd" });
      expect(navigate).toHaveBeenCalledExactlyOnceWith("/elections/1/polling-stations", { replace: true });
    });

    test("Shows an error message when delete was not possible", async () => {
      const user = userEvent.setup();

      const url = `/api/elections/${testPollingStation.election_id}/polling_stations/${testPollingStation.id}`;
      overrideOnce("delete", url, 422, {
        error: "Invalid data",
        fatal: false,
        reference: "InvalidData",
      });

      renderPage("coordinator");

      expect(await screen.findByTestId("polling-station-form")).toBeVisible();
      const deleteButton = await screen.findByRole("button", { name: "Stembureau verwijderen" });
      await user.click(deleteButton);

      const modal = await screen.findByTestId("modal-dialog");
      expect(modal).toHaveTextContent("Stembureau verwijderen?");

      const confirmButton = await within(modal).findByRole("button", { name: "Verwijderen" });
      await user.click(confirmButton);

      const deleteAlert = await screen.findByRole("alert");
      expect(within(deleteAlert).getByRole("strong")).toHaveTextContent("Stembureau kan niet verwijderd worden");
      expect(within(deleteAlert).getByRole("paragraph")).toHaveTextContent(
        "Er zijn al tellingen ingevoerd. De invoer moet eerst verwijderd worden om dit stembureau te kunnen verwijderen.",
      );
    });
  });

  test.each([
    { status: "created", allowed: true },
    { status: "data_entry_not_started", allowed: true },
    { status: "data_entry_in_progress", allowed: false },
    { status: "data_entry_paused", allowed: false },
    { status: "data_entry_finished", allowed: false },
  ] satisfies Array<{ status: CommitteeSessionStatus; allowed: boolean }>)(
    "Renders page when committee session status=$status is allowed=$allowed for administrator",
    async ({ status, allowed }) => {
      overrideOnce("get", "/api/elections/1", 200, getElectionMockData({}, { status }));

      renderPage("administrator");

      if (allowed) {
        expect(await screen.findByTestId("polling-station-form")).toBeVisible();
        expect(screen.getByRole("textbox", { name: "Nummer" })).toHaveValue("33");
        expect(screen.getByRole("textbox", { name: "Naam" })).toHaveValue("Op Rolletjes");
      } else {
        await waitFor(() => {
          expect(navigate).toHaveBeenCalledWith("/elections/1/polling-stations");
        });
      }
    },
  );
});

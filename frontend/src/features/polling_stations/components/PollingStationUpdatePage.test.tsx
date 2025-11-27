import * as ReactRouter from "react-router";

import { userEvent } from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";

import * as useMessages from "@/hooks/messages/useMessages";
import { ElectionProvider } from "@/hooks/election/ElectionProvider";
import { ElectionStatusProvider } from "@/hooks/election/ElectionStatusProvider";
import { getElectionMockData } from "@/testing/api-mocks/ElectionMockData";
import { getElectionStatusMockData } from "@/testing/api-mocks/ElectionStatusMockData";
import {
  ElectionRequestHandler,
  ElectionStatusRequestHandler,
  PollingStationDeleteHandler,
  PollingStationGetHandler,
  PollingStationUpdateHandler,
} from "@/testing/api-mocks/RequestHandlers";
import { overrideOnce, server } from "@/testing/server";
import { renderReturningRouter, screen, spyOnHandler, waitFor, within } from "@/testing/test-utils";
import { TestUserProvider } from "@/testing/TestUserProvider";
import { CommitteeSessionStatus, DataEntryStatusName, PollingStation, Role } from "@/types/generated/openapi";

import { PollingStationUpdatePage } from "./PollingStationUpdatePage";

const navigate = vi.fn();

function renderPage(userRole: Role) {
  return renderReturningRouter(
    <TestUserProvider userRole={userRole}>
      <ElectionProvider electionId={1}>
        <ElectionStatusProvider electionId={1}>
          <PollingStationUpdatePage />
        </ElectionStatusProvider>
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
    server.use(
      ElectionRequestHandler,
      ElectionStatusRequestHandler,
      PollingStationGetHandler,
      PollingStationUpdateHandler,
    );
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
    test("Delete button should not be shown when polling station is linked to previous session", async () => {
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
      expect(
        await screen.findByText("Er zijn al tellingen ingevoerd voor dit stembureau in een eerdere zitting."),
      ).toBeVisible();
    });

    test("Returns to list page with a message when clicking delete polling station", async () => {
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
      expect(navigate).toHaveBeenCalledExactlyOnceWith("/elections/1/polling-stations");
    });

    test("Shows an error message when delete was not possible because a data entry exists", async () => {
      const user = userEvent.setup();

      const url = `/api/elections/${testPollingStation.election_id}/polling_stations/${testPollingStation.id}`;
      overrideOnce("delete", url, 409, {
        error: "Polling station cannot be deleted, because a data entry exists",
        fatal: false,
        reference: "PollingStationCannotBeDeleted",
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
        "Er zijn al tellingen ingevoerd voor dit stembureau. De invoer moet eerst verwijderd worden om dit stembureau te kunnen verwijderen.",
      );
    });

    test("Shows an error message when delete was not possible because an investigation exists", async () => {
      const user = userEvent.setup();

      const url = `/api/elections/${testPollingStation.election_id}/polling_stations/${testPollingStation.id}`;
      overrideOnce("delete", url, 409, {
        error: "Polling station cannot be deleted, because an investigation exists",
        fatal: false,
        reference: "PollingStationCannotBeDeleted",
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
        "Er is een onderzoek voor dit stembureau. Het onderzoek moet eerst verwijderd worden om dit stembureau te kunnen verwijderen.",
      );
    });

    test("Renders a message and link instead of delete button because an investigation exists", async () => {
      overrideOnce("get", "/api/elections/1", 200, getElectionMockData({}, { number: 2 }));
      const user = userEvent.setup();

      const router = renderPage("coordinator");

      expect(await screen.findByTestId("polling-station-form")).toBeVisible();
      const deleteButton = screen.queryByRole("button", { name: "Stembureau verwijderen" });
      expect(deleteButton).not.toBeInTheDocument();
      expect(await screen.findByText("Stembureau verwijderen niet mogelijk")).toBeVisible();
      const explanation = await screen.findByText(/Er is een onderzoek voor dit stembureau./);
      expect(explanation).toBeVisible();
      const link = within(explanation).getByRole("link", { name: "Verwijder eerst het onderzoek" });
      await user.click(link);
      await waitFor(() => {
        expect(router.state.location.pathname).toEqual("/elections/1/investigations/1/findings");
      });
    });

    test.each([
      { status: "first_entry_not_started", allowed: true },
      { status: "first_entry_in_progress", allowed: false },
      { status: "first_entry_has_errors", allowed: false },
      { status: "second_entry_not_started", allowed: false },
      { status: "second_entry_in_progress", allowed: false },
      { status: "definitive", allowed: false },
      { status: "entries_different", allowed: false },
    ] satisfies Array<{ status: DataEntryStatusName; allowed: boolean }>)(
      "Renders delete button when polling station data entry status=$status is allowed=$allowed",
      async ({ status, allowed }) => {
        overrideOnce("get", "/api/elections/1/status", 200, getElectionStatusMockData({ status: status }));
        const user = userEvent.setup();

        const router = renderPage("coordinator");

        expect(await screen.findByTestId("polling-station-form")).toBeVisible();

        if (allowed) {
          const deleteButton = await screen.findByRole("button", { name: "Stembureau verwijderen" });
          expect(deleteButton).toBeInTheDocument();
        } else {
          const deleteButton = screen.queryByRole("button", { name: "Stembureau verwijderen" });
          expect(deleteButton).not.toBeInTheDocument();
          expect(await screen.findByText("Stembureau verwijderen niet mogelijk")).toBeVisible();
          const explanation = await screen.findByText(/Er zijn al tellingen ingevoerd voor dit stembureau./);
          expect(explanation).toBeVisible();
          const link = within(explanation).getByRole("link", { name: "Verwijder eerst de invoer" });
          await user.click(link);
          await waitFor(() => {
            expect(router.state.location.pathname).toEqual("/elections/1/status/1/detail");
          });
        }
      },
    );
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

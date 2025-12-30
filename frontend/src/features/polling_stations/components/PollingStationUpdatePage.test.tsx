import { userEvent } from "@testing-library/user-event";
import * as ReactRouter from "react-router";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { ElectionProvider } from "@/hooks/election/ElectionProvider";
import { ElectionStatusProvider } from "@/hooks/election/ElectionStatusProvider";
import * as useMessages from "@/hooks/messages/useMessages";
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
import { TestUserProvider } from "@/testing/TestUserProvider";
import { render, screen, spyOnHandler, waitFor, within } from "@/testing/test-utils";
import { CommitteeSessionStatus, DataEntryStatusName, PollingStation, Role } from "@/types/generated/openapi";

import { PollingStationUpdatePage } from "./PollingStationUpdatePage";

const navigate = vi.fn();

function renderPage(userRole: Role) {
  return render(
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
    address: "Teststraat 1",
    postal_code: "1234 AB",
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

  test("Navigates back on save with a success message", async () => {
    renderPage("coordinator");

    expect(await screen.findByTestId("polling-station-form")).toBeVisible();
    const saveButton = await screen.findByRole("button", { name: "Wijzigingen opslaan" });
    saveButton.click();

    await waitFor(() => {
      expect(pushMessage).toHaveBeenCalledWith({ title: "Stembureau 34 (Testplek) aangepast" });
      expect(navigate).toHaveBeenCalledExactlyOnceWith("/elections/1/polling-stations");
    });
  });

  test("Navigates back on save with a warning message when data entry finished", async () => {
    overrideOnce("get", "/api/elections/1", 200, getElectionMockData({}, { status: "data_entry_finished" }));

    renderPage("coordinator");

    expect(await screen.findByTestId("polling-station-form")).toBeVisible();
    const saveButton = await screen.findByRole("button", { name: "Wijzigingen opslaan" });
    saveButton.click();

    await waitFor(() => {
      expect(pushMessage).toHaveBeenCalledWith({
        type: "warning",
        title: "Maak een nieuw proces-verbaal voor deze zitting",
        text: "Stembureau 34 (Testplek) aangepast. De eerder gemaakte documenten van deze zitting zijn daardoor niet meer geldig. Maak een nieuw proces-verbaal door de invoerfase opnieuw af te ronden.",
      });
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

    test("Returns to list page with a success message when clicking delete polling station", async () => {
      server.use(PollingStationDeleteHandler);
      const user = userEvent.setup();

      renderPage("coordinator");

      expect(await screen.findByTestId("polling-station-form")).toBeVisible();
      const deleteButton = await screen.findByRole("button", { name: "Stembureau verwijderen" });
      await user.click(deleteButton);

      const modal = await screen.findByTestId("modal-dialog");
      expect(modal).toHaveTextContent("Stembureau verwijderen?");
      expect(modal).toHaveTextContent("Deze actie kan niet worden teruggedraaid.");

      const deletePollingStation = spyOnHandler(PollingStationDeleteHandler);

      const confirmButton = await within(modal).findByRole("button", { name: "Verwijderen" });
      await user.click(confirmButton);

      expect(deletePollingStation).toHaveBeenCalled();

      expect(pushMessage).toHaveBeenCalledWith({ title: "Stembureau 33 (Op Rolletjes) verwijderd" });
      expect(navigate).toHaveBeenCalledExactlyOnceWith("/elections/1/polling-stations", { replace: true });
    });

    test("Returns to list page with a warning message when clicking delete polling station when data entry finished", async () => {
      server.use(PollingStationDeleteHandler);
      overrideOnce("get", "/api/elections/1", 200, getElectionMockData({}, { status: "data_entry_finished" }));

      const user = userEvent.setup();

      renderPage("coordinator");

      expect(await screen.findByTestId("polling-station-form")).toBeVisible();
      const deleteButton = await screen.findByRole("button", { name: "Stembureau verwijderen" });
      await user.click(deleteButton);

      const modal = await screen.findByTestId("modal-dialog");
      expect(modal).toHaveTextContent("Stembureau verwijderen?");
      expect(modal).toHaveTextContent("Deze actie kan niet worden teruggedraaid.");

      const deletePollingStation = spyOnHandler(PollingStationDeleteHandler);

      const confirmButton = await within(modal).findByRole("button", { name: "Verwijderen" });
      await user.click(confirmButton);

      expect(deletePollingStation).toHaveBeenCalled();

      expect(pushMessage).toHaveBeenCalledWith({
        type: "warning",
        title: "Maak een nieuw proces-verbaal voor deze zitting",
        text: "Stembureau 33 (Op Rolletjes) verwijderd. De eerder gemaakte documenten van deze zitting zijn daardoor niet meer geldig. Maak een nieuw proces-verbaal door de invoerfase opnieuw af te ronden.",
      });
      expect(navigate).toHaveBeenCalledExactlyOnceWith("/elections/1/polling-stations", { replace: true });
    });

    test.each([
      { status: "first_entry_not_started", extra_warning: false },
      { status: "first_entry_in_progress", extra_warning: true },
      { status: "first_entry_has_errors", extra_warning: true },
      { status: "second_entry_not_started", extra_warning: true },
      { status: "second_entry_in_progress", extra_warning: true },
      { status: "definitive", extra_warning: true },
      { status: "entries_different", extra_warning: true },
    ] satisfies Array<{
      status: DataEntryStatusName;
      extra_warning: boolean;
    }>)("Renders delete button when polling station data entry status=$status with extra warning=$extra_warning", async ({
      status,
      extra_warning,
    }) => {
      overrideOnce("get", "/api/elections/1/status", 200, getElectionStatusMockData({ status: status }));
      const user = userEvent.setup();

      renderPage("coordinator");

      expect(await screen.findByTestId("polling-station-form")).toBeVisible();
      const deleteButton = await screen.findByRole("button", { name: "Stembureau verwijderen" });
      expect(deleteButton).toBeInTheDocument();
      await user.click(deleteButton);
      const modal = await screen.findByTestId("modal-dialog");

      if (extra_warning) {
        expect(modal).toHaveTextContent("Stembureau verwijderen?");
        expect(modal).toHaveTextContent(
          "Let op: Er is in deze zitting invoer voor dit stembureau gedaan. De invoer wordt ook verwijderd. Deze actie kan niet worden teruggedraaid.",
        );
      } else {
        expect(modal).toHaveTextContent("Stembureau verwijderen?");
        expect(modal).toHaveTextContent("Deze actie kan niet worden teruggedraaid.");
      }
    });

    test.each([
      { status: "first_entry_not_started", double_warning: false },
      { status: "first_entry_in_progress", double_warning: true },
      { status: "first_entry_has_errors", double_warning: true },
      { status: "second_entry_not_started", double_warning: true },
      { status: "second_entry_in_progress", double_warning: true },
      { status: "definitive", double_warning: true },
      { status: "entries_different", double_warning: true },
    ] satisfies Array<{
      status: DataEntryStatusName;
      double_warning: boolean;
    }>)("Renders delete button when an investigation exists and polling station data entry status=$status with double warning=$double_warning", async ({
      status,
      double_warning,
    }) => {
      overrideOnce("get", "/api/elections/1", 200, getElectionMockData({}, { number: 2 }));
      overrideOnce("get", "/api/elections/1/status", 200, getElectionStatusMockData({ status: status }));
      const user = userEvent.setup();

      renderPage("coordinator");

      expect(await screen.findByTestId("polling-station-form")).toBeVisible();
      const deleteButton = await screen.findByRole("button", { name: "Stembureau verwijderen" });
      expect(deleteButton).toBeInTheDocument();
      await user.click(deleteButton);
      const modal = await screen.findByTestId("modal-dialog");

      if (double_warning) {
        expect(modal).toHaveTextContent("Stembureau verwijderen?");
        expect(modal).toHaveTextContent(
          "Let op: Er is in deze zitting een onderzoek voor dit stembureau aangemaakt én invoer gedaan. Het onderzoek en de invoer worden ook verwijderd. Deze actie kan niet worden teruggedraaid.",
        );
      } else {
        expect(modal).toHaveTextContent("Stembureau verwijderen?");
        expect(modal).toHaveTextContent(
          "Let op: Er is in deze zitting een onderzoek voor dit stembureau aangemaakt. Het onderzoek wordt ook verwijderd. Deze actie kan niet worden teruggedraaid.",
        );
      }
    });
  });

  test.each([
    { status: "created", allowed: true },
    { status: "data_entry_not_started", allowed: true },
    { status: "data_entry_in_progress", allowed: false },
    { status: "data_entry_paused", allowed: false },
    { status: "data_entry_finished", allowed: false },
  ] satisfies Array<{
    status: CommitteeSessionStatus;
    allowed: boolean;
  }>)("Renders page when committee session status=$status is allowed=$allowed for administrator", async ({
    status,
    allowed,
  }) => {
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
  });
});

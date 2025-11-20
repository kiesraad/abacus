import * as ReactRouter from "react-router";

import { userEvent } from "@testing-library/user-event";
import { within } from "storybook/test";
import { beforeEach, describe, expect, test, vi } from "vitest";

import * as useMessages from "@/hooks/messages/useMessages";
import { ElectionProvider } from "@/hooks/election/ElectionProvider";
import { getElectionMockData } from "@/testing/api-mocks/ElectionMockData";
import { ElectionRequestHandler, PollingStationListRequestHandler } from "@/testing/api-mocks/RequestHandlers";
import { overrideOnce, server } from "@/testing/server";
import { render, screen, waitFor } from "@/testing/test-utils";
import { TestUserProvider } from "@/testing/TestUserProvider";
import { CommitteeSessionStatus, PollingStationListResponse, Role } from "@/types/generated/openapi";

import { PollingStationListPage } from "./PollingStationListPage";

const navigate = vi.fn();

function renderPage(userRole: Role) {
  return render(
    <TestUserProvider userRole={userRole}>
      <ElectionProvider electionId={1}>
        <PollingStationListPage />
      </ElectionProvider>
    </TestUserProvider>,
  );
}

describe("PollingStationListPage", () => {
  beforeEach(() => {
    server.use(ElectionRequestHandler, PollingStationListRequestHandler);
    vi.spyOn(ReactRouter, "useNavigate").mockImplementation(() => navigate);
    vi.spyOn(useMessages, "useMessages").mockReturnValue({
      pushMessage: vi.fn(),
      popMessages: vi.fn(() => []),
      hasMessages: vi.fn(() => false),
    });
  });

  test("Shows polling stations", async () => {
    const user = userEvent.setup();
    renderPage("coordinator");

    expect(await screen.findByRole("heading", { level: 1, name: "Stembureaus beheren" })).toBeVisible();
    expect(await screen.findByRole("link", { name: "Stembureau toevoegen" })).toBeVisible();

    const table = await screen.findByRole("table");
    expect(table).toBeVisible();
    expect(table).toHaveTableContent([
      ["Nummer", "Naam", "Soort"],
      ["33", "Op Rolletjes", "Mobiel"],
      ["34", "Testplek", "Bijzonder"],
      ["35", "Testschool", "Vaste locatie"],
      ["36", "Testbuurthuis", "–"],
      ["37", "Dansschool Oeps nou deed ik het weer", "–"],
      ["38", "Testmuseum", "Bijzonder"],
      ["39", "Test gemeentehuis", "Mobiel"],
      ["40", "Test kerk", "Vaste locatie"],
    ]);

    const tableRows = within(table).queryAllByRole("row");
    await user.click(tableRows[1]!);

    await waitFor(() => {
      expect(navigate).toHaveBeenCalledExactlyOnceWith("1/update");
    });
  });

  test("Show no polling stations message", async () => {
    overrideOnce("get", "/api/elections/1/polling_stations", 200, {
      polling_stations: [],
    } satisfies PollingStationListResponse);

    renderPage("coordinator");

    expect(await screen.findByRole("heading", { level: 1, name: "Stembureaus beheren" })).toBeVisible();
    expect(await screen.findByText(/Er zijn nog geen stembureaus ingevoerd/)).toBeVisible();
    expect(screen.queryByRole("table")).toBeNull();
  });

  test("Show add and import buttons", async () => {
    overrideOnce("get", "/api/elections/1/polling_stations", 200, {
      polling_stations: [],
    } satisfies PollingStationListResponse);

    renderPage("coordinator");

    expect(await screen.findByRole("heading", { level: 1, name: "Stembureaus beheren" })).toBeVisible();
    expect(screen.getByText("Handmatig invullen")).toBeVisible();
    expect(screen.getByText("Importeren uit een bestand")).toBeVisible();
  });

  test.each([
    { status: "created", allowed: true },
    { status: "data_entry_not_started", allowed: true },
    { status: "data_entry_in_progress", allowed: false },
    { status: "data_entry_paused", allowed: false },
    { status: "data_entry_finished", allowed: false },
  ] satisfies Array<{ status: CommitteeSessionStatus; allowed: boolean }>)(
    "Polling station update links and add button with committee session status=$status are allowed=$allowed for administrator",
    async ({ status, allowed }) => {
      const user = userEvent.setup();
      overrideOnce("get", "/api/elections/1", 200, getElectionMockData({}, { status }));

      renderPage("administrator");

      expect(await screen.findByRole("heading", { level: 1, name: "Stembureaus beheren" })).toBeVisible();

      const table = await screen.findByRole("table");
      expect(table).toBeVisible();

      const tableRows = within(table).queryAllByRole("row");
      await user.click(tableRows[1]!);

      if (allowed) {
        await waitFor(() => {
          expect(navigate).toHaveBeenCalledExactlyOnceWith("1/update");
        });
        expect(await screen.findByRole("link", { name: "Stembureau toevoegen" })).toBeVisible();
      } else {
        expect(navigate).not.toHaveBeenCalled();
        expect(screen.queryByRole("link", { name: "Stembureau toevoegen" })).not.toBeInTheDocument();
      }
    },
  );
});

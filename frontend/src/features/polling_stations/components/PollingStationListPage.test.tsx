import { userEvent } from "@testing-library/user-event";
import * as ReactRouter from "react-router";
import { within } from "storybook/test";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { ElectionProvider } from "@/hooks/election/ElectionProvider";
import * as useMessages from "@/hooks/messages/useMessages";
import { getElectionMockData } from "@/testing/api-mocks/ElectionMockData";
import { ElectionRequestHandler, PollingStationListRequestHandler } from "@/testing/api-mocks/RequestHandlers";
import { overrideOnce, server } from "@/testing/server";
import { TestUserProvider } from "@/testing/TestUserProvider";
import { render, screen, waitFor } from "@/testing/test-utils";
import type { CommitteeSessionStatus, PollingStationListResponse, Role } from "@/types/generated/openapi";
import * as download from "@/utils/download";

import { PollingStationListPage } from "./PollingStationListPage";

const navigate = vi.fn();

async function renderPage(userRole: Role) {
  render(
    <TestUserProvider userRole={userRole}>
      <ElectionProvider electionId={1}>
        <PollingStationListPage />
      </ElectionProvider>
    </TestUserProvider>,
  );

  // Ensure component is rendered.
  await screen.findByRole("heading", { level: 1, name: "Stembureaus beheren" });
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

  describe("Coordinator: with polling stations", () => {
    test("Shows polling stations in table", async () => {
      await renderPage("coordinator_gsb");

      const table = screen.getByRole("table");
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
    });

    test("Navigate to update page on table row click", async () => {
      await renderPage("coordinator_gsb");
      const user = userEvent.setup();

      const table = screen.getByRole("table");
      const tableRows = within(table).getAllByRole("row");
      await user.click(tableRows[1]!);

      await waitFor(() => {
        expect(navigate).toHaveBeenCalledExactlyOnceWith("1/update");
      });
    });

    test("Show button to add polling station", async () => {
      await renderPage("coordinator_gsb");
      expect(screen.getByRole("link", { name: "Stembureau toevoegen" })).toBeVisible();
    });

    test("Show button to export polling stations list", async () => {
      await renderPage("coordinator_gsb");
      expect(screen.getByRole("button", { name: "Lijst exporteren" })).toBeVisible();
    });

    test("Download the polling station list on export button click", async () => {
      await renderPage("coordinator_gsb");
      const user = userEvent.setup();
      const directDownload = vi.spyOn(download, "directDownload").mockImplementation(() => {});
      await user.click(screen.getByRole("button", { name: "Lijst exporteren" }));
      expect(directDownload).toHaveBeenCalledExactlyOnceWith("/api/elections/1/polling_stations/export");
    });
  });

  describe("Coordinator: without polling stations", () => {
    const emptyPollingStationListResponse: PollingStationListResponse = { polling_stations: [] };

    beforeEach(() => {
      overrideOnce("get", "/api/elections/1/polling_stations", 200, emptyPollingStationListResponse);
    });

    test("Show header and message and do not show table", async () => {
      await renderPage("coordinator_gsb");
      expect(screen.getByText("Hoe wil je stembureaus toevoegen?")).toBeVisible();
      expect(screen.getByText(/Er zijn nog geen stembureaus ingevoerd/)).toBeVisible();
      expect(screen.queryByRole("table")).not.toBeInTheDocument();
    });

    test("Show button to import polling stations from file", async () => {
      await renderPage("coordinator_gsb");
      expect(screen.getByRole("link", { name: "Importeren uit een bestand" })).toBeVisible();
    });

    test("Show button to manually add polling station", async () => {
      await renderPage("coordinator_gsb");
      expect(screen.getByRole("link", { name: "Handmatig invullen" })).toBeVisible();
    });

    test("Do not show button to export polling stations list", async () => {
      await renderPage("coordinator_gsb");
      expect(screen.queryByRole("button", { name: "Lijst exporteren" })).not.toBeInTheDocument();
    });
  });

  describe("Administrator permissions per committee session status", () => {
    test.each([
      { status: "created", allowed: true },
      { status: "in_preparation", allowed: true },
      { status: "data_entry", allowed: false },
      { status: "paused", allowed: false },
      { status: "completed", allowed: false },
    ] satisfies Array<{
      status: CommitteeSessionStatus;
      allowed: boolean;
    }>)("When committee session status=$status, editing polling stations is allowed=$allowed for administrator (export is always allowed)", async ({
      status,
      allowed,
    }) => {
      overrideOnce("get", "/api/elections/1", 200, getElectionMockData({}, { status }));
      await renderPage("administrator");
      const user = userEvent.setup();

      const table = screen.getByRole("table");
      expect(table).toBeVisible();

      const tableRows = within(table).getAllByRole("row");
      await user.click(tableRows[1]!);

      expect(screen.getByRole("button", { name: "Lijst exporteren" })).toBeVisible();

      if (allowed) {
        await waitFor(() => {
          expect(navigate).toHaveBeenCalledExactlyOnceWith("1/update");
        });
        expect(screen.getByRole("link", { name: "Stembureau toevoegen" })).toBeVisible();
      } else {
        expect(navigate).not.toHaveBeenCalled();
        expect(screen.queryByRole("link", { name: "Stembureau toevoegen" })).not.toBeInTheDocument();
        const infoAlert = screen.getByRole("alert");
        expect(within(infoAlert).getByRole("strong")).toHaveTextContent("Stembureaus kunnen niet aangepast worden");
      }
    });
  });
});

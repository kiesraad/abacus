import { ReactNode } from "react";
import { RouterProvider } from "react-router";

import { render as rtlRender } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { ApiProvider } from "@/api/ApiProvider";
import { ErrorBoundary } from "@/components/error/ErrorBoundary";
import { electionManagementRoutes } from "@/features/election_management/routes";
import { ElectionProvider } from "@/hooks/election/ElectionProvider";
import { ElectionStatusProvider } from "@/hooks/election/ElectionStatusProvider";
import {
  getCommitteeSessionListMockData,
  getCommitteeSessionMockData,
} from "@/testing/api-mocks/CommitteeSessionMockData";
import { getElectionMockData } from "@/testing/api-mocks/ElectionMockData";
import {
  CommitteeSessionCreateHandler,
  ElectionCommitteeSessionListRequestHandler,
  ElectionRequestHandler,
} from "@/testing/api-mocks/RequestHandlers";
import { getRouter, Router } from "@/testing/router";
import { overrideOnce, server } from "@/testing/server";
import { expectConflictErrorPage, render, screen, setupTestRouter, spyOnHandler, within } from "@/testing/test-utils";
import { TestUserProvider } from "@/testing/TestUserProvider";
import { CommitteeSessionListResponse, ElectionDetailsResponse, ErrorResponse, Role } from "@/types/generated/openapi";

import { ElectionHomePage } from "./ElectionHomePage";

const renderPage = async (userRole: Role) => {
  render(
    <TestUserProvider userRole={userRole}>
      <ElectionProvider electionId={1}>
        <ElectionStatusProvider electionId={1}>
          <ElectionHomePage />
        </ElectionStatusProvider>
      </ElectionProvider>
    </TestUserProvider>,
  );
  expect(await screen.findByRole("heading", { level: 1, name: "Gemeenteraadsverkiezingen 2026" })).toBeVisible();
  expect(
    await screen.findByRole("heading", { level: 2, name: "Gemeentelijk stembureau 0035 Heemdamseburg" }),
  ).toBeVisible();
};

describe("ElectionHomePage", () => {
  beforeEach(() => {
    server.use(ElectionCommitteeSessionListRequestHandler);
    overrideOnce("get", "/api/elections/1/status", 200, {
      statuses: [],
    });
  });

  test("Shows committee session card(s) and election information table", async () => {
    server.use(ElectionRequestHandler);

    await renderPage("coordinator");

    const committee_session_cards = await screen.findByTestId("committee-session-cards");
    expect(committee_session_cards).toBeVisible();
    expect(within(committee_session_cards).getByText("Tweede zitting")).toBeVisible();
    expect(within(committee_session_cards).getByText("— Steminvoer bezig")).toBeVisible();
    expect(within(committee_session_cards).getByText("Eerste zitting")).toBeVisible();
    expect(within(committee_session_cards).getByText("— Steminvoer afgerond")).toBeVisible();
    expect(screen.queryByRole("button", { name: "Nieuwe zitting voorbereiden" })).not.toBeInTheDocument();

    expect(await screen.findByRole("heading", { level: 3, name: "Over deze verkiezing" })).toBeVisible();
    const election_information_table = await screen.findByTestId("election-information-table");
    expect(election_information_table).toBeVisible();
    expect(election_information_table).toHaveTableContent([
      ["Verkiezing", "Gemeenteraadsverkiezingen 2026, 30 november"],
      ["Kiesgebied", "0035 - Gemeente Heemdamseburg"],
      ["Lijsten en kandidaten", "2 lijsten en 31 kandidaten"],
      ["Aantal kiesgerechtigden", "2.000"],
      ["Invoer doen voor", "Gemeentelijk stembureau"],
      ["Stembureaus", "8 stembureaus"],
      ["Type stemopneming", "Centrale stemopneming"],
    ]);
  });

  test("Shows create new committee session button and clicking it creates a new committee session", async () => {
    const user = userEvent.setup();
    server.use(CommitteeSessionCreateHandler);
    const sessionCreateRequestSpy = spyOnHandler(CommitteeSessionCreateHandler);
    const electionData = getElectionMockData({}, { status: "data_entry_finished" });
    server.use(
      http.get("/api/elections/1", () =>
        HttpResponse.json(electionData satisfies ElectionDetailsResponse, { status: 200 }),
      ),
    );
    const committeeSessionData = getCommitteeSessionMockData({ status: "data_entry_finished" });
    server.use(
      http.get("/api/elections/1/committee_sessions", () =>
        HttpResponse.json({ committee_sessions: [committeeSessionData] } satisfies CommitteeSessionListResponse, {
          status: 200,
        }),
      ),
    );

    await renderPage("coordinator");

    const committee_session_cards = await screen.findByTestId("committee-session-cards");
    expect(committee_session_cards).toBeVisible();
    expect(within(committee_session_cards).getByText("Eerste zitting")).toBeVisible();
    expect(within(committee_session_cards).getByText("— Steminvoer afgerond")).toBeVisible();

    const createButton = screen.getByRole("button", { name: "Nieuwe zitting voorbereiden" });
    expect(createButton).toBeVisible();

    await user.click(createButton);

    const modal = await screen.findByRole("dialog");
    expect(modal).toBeVisible();
    const title = within(modal).getByText("Onderzoek in opdracht van het CSB?");
    expect(title).toBeVisible();

    const addButton = within(modal).getByRole("button", { name: "Ja, zitting toevoegen" });
    expect(addButton).toBeVisible();
    await user.click(addButton);

    expect(sessionCreateRequestSpy).toHaveBeenCalledWith({ election_id: 1 });
  });

  test("Does not shows create new committee session button for administrator", async () => {
    const electionData = getElectionMockData({}, { status: "data_entry_finished" });
    server.use(
      http.get("/api/elections/1", () =>
        HttpResponse.json(electionData satisfies ElectionDetailsResponse, { status: 200 }),
      ),
    );
    const committeeSessionData = getCommitteeSessionMockData({ status: "data_entry_finished" });
    server.use(
      http.get("/api/elections/1/committee_sessions", () =>
        HttpResponse.json({ committee_sessions: [committeeSessionData] } satisfies CommitteeSessionListResponse, {
          status: 200,
        }),
      ),
    );

    await renderPage("administrator");

    const committee_session_cards = await screen.findByTestId("committee-session-cards");
    expect(committee_session_cards).toBeVisible();
    expect(within(committee_session_cards).getByText("Eerste zitting")).toBeVisible();
    expect(within(committee_session_cards).getByText("— Steminvoer afgerond")).toBeVisible();

    expect(screen.queryByRole("button", { name: "Nieuwe zitting voorbereiden" })).not.toBeInTheDocument();

    expect(await screen.findByRole("heading", { level: 3, name: "Over deze verkiezing" })).toBeVisible();
    const election_information_table = await screen.findByTestId("election-information-table");
    expect(election_information_table).toBeVisible();
    expect(election_information_table).toHaveTableContent([
      ["Verkiezing", "Gemeenteraadsverkiezingen 2026, 30 november"],
      ["Kiesgebied", "0035 - Gemeente Heemdamseburg"],
      ["Lijsten en kandidaten", "2 lijsten en 31 kandidaten"],
      ["Aantal kiesgerechtigden", "2.000"],
      ["Invoer doen voor", "Gemeentelijk stembureau"],
      ["Stembureaus", "8 stembureaus"],
      ["Type stemopneming", "Centrale stemopneming"],
    ]);
  });

  test("Shows error page when start data entry call returns an error", async () => {
    // Since we test what happens after an error, we want vitest to ignore them
    vi.spyOn(console, "error").mockImplementation(() => {
      /* do nothing */
    });
    const Providers = ({
      children,
      router = getRouter(children),
      fetchInitialUser = false,
    }: {
      children?: ReactNode;
      router?: Router;
      fetchInitialUser?: boolean;
    }) => {
      return (
        <ApiProvider fetchInitialUser={fetchInitialUser}>
          <TestUserProvider userRole="coordinator">
            <ElectionProvider electionId={1}>
              <ElectionStatusProvider electionId={1}>
                <RouterProvider router={router} />
              </ElectionStatusProvider>
            </ElectionProvider>
          </TestUserProvider>
        </ApiProvider>
      );
    };
    const router = setupTestRouter([
      {
        Component: null,
        errorElement: <ErrorBoundary />,
        children: [
          {
            path: "elections/:electionId",
            children: electionManagementRoutes,
          },
        ],
      },
    ]);
    const user = userEvent.setup();
    const electionData = getElectionMockData({}, { status: "data_entry_not_started" });
    server.use(
      http.get("/api/elections/1", () =>
        HttpResponse.json(electionData satisfies ElectionDetailsResponse, { status: 200 }),
      ),
    );
    const committeeSessionsData = getCommitteeSessionListMockData({ status: "data_entry_not_started" });
    server.use(
      http.get("/api/elections/1/committee_sessions", () =>
        HttpResponse.json(committeeSessionsData satisfies CommitteeSessionListResponse, { status: 200 }),
      ),
    );
    overrideOnce("put", "/api/committee_sessions/2/status", 409, {
      error: "Invalid committee session status",
      fatal: true,
      reference: "InvalidCommitteeSessionStatus",
    } satisfies ErrorResponse);

    await router.navigate("/elections/1");

    rtlRender(<Providers router={router} />);

    expect(await screen.findByRole("heading", { level: 1, name: "Gemeenteraadsverkiezingen 2026" })).toBeVisible();
    expect(
      await screen.findByRole("heading", { level: 2, name: "Gemeentelijk stembureau 0035 Heemdamseburg" }),
    ).toBeVisible();

    const committee_session_cards = await screen.findByTestId("committee-session-cards");
    expect(committee_session_cards).toBeVisible();
    expect(within(committee_session_cards).getByText("Tweede zitting")).toBeVisible();
    expect(within(committee_session_cards).getByText("— Klaar voor steminvoer")).toBeVisible();
    expect(within(committee_session_cards).getByText("Eerste zitting")).toBeVisible();
    expect(within(committee_session_cards).getByText("— Steminvoer afgerond")).toBeVisible();

    const startButton = screen.getByRole("button", { name: "Start steminvoer" });
    expect(startButton).toBeVisible();

    await user.click(startButton);

    await expectConflictErrorPage();
    expect(console.error).toHaveBeenCalled();
  });

  test("Shows alert when there are no polling stations", async () => {
    const electionData = getElectionMockData();
    electionData.polling_stations = [];
    server.use(
      http.get("/api/elections/1", () =>
        HttpResponse.json(electionData satisfies ElectionDetailsResponse, { status: 200 }),
      ),
    );

    await renderPage("coordinator");

    const alert = await screen.findByRole("alert");
    expect(within(alert).getByRole("strong")).toHaveTextContent("Geen stembureaus");
    const alertParagraphs = within(alert).getAllByRole("paragraph");
    expect(alertParagraphs[0]!).toHaveTextContent(
      "De invoerfase kan pas gestart worden als er stembureaus zijn toegevoegd.",
    );
    expect(within(alertParagraphs[1]!).getByRole("link", { name: "Stembureaus beheren" })).toBeVisible();

    const committee_session_cards = await screen.findByTestId("committee-session-cards");
    expect(committee_session_cards).toBeVisible();
    expect(within(committee_session_cards).getByText("Tweede zitting")).toBeVisible();
    expect(within(committee_session_cards).getByText("— Steminvoer bezig")).toBeInTheDocument();
    expect(within(committee_session_cards).getByText("Eerste zitting")).toBeVisible();
    expect(within(committee_session_cards).getByText("— Steminvoer afgerond")).toBeInTheDocument();

    expect(await screen.findByRole("heading", { level: 3, name: "Over deze verkiezing" })).toBeVisible();
    const election_information_table = await screen.findByTestId("election-information-table");
    expect(election_information_table).toBeVisible();
    expect(election_information_table).toHaveTableContent([
      ["Verkiezing", "Gemeenteraadsverkiezingen 2026, 30 november"],
      ["Kiesgebied", "0035 - Gemeente Heemdamseburg"],
      ["Lijsten en kandidaten", "2 lijsten en 31 kandidaten"],
      ["Aantal kiesgerechtigden", "2.000"],
      ["Invoer doen voor", "Gemeentelijk stembureau"],
      ["Stembureaus", "0 stembureaus"],
      ["Type stemopneming", "Centrale stemopneming"],
    ]);
  });
});

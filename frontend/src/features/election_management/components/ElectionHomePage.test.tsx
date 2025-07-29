import { RouterProvider } from "react-router";

import { render as rtlRender } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { ApiProvider } from "@/api/ApiProvider.tsx";
import { ErrorBoundary } from "@/components/error/ErrorBoundary.tsx";
import { electionManagementRoutes } from "@/features/election_management/routes.tsx";
import { ElectionProvider } from "@/hooks/election/ElectionProvider";
import { ElectionStatusProvider } from "@/hooks/election/ElectionStatusProvider";
import { getCommitteeSessionListMockData } from "@/testing/api-mocks/CommitteeSessionMockData.ts";
import { getElectionMockData } from "@/testing/api-mocks/ElectionMockData";
import {
  ElectionCommitteeSessionListRequestHandler,
  ElectionRequestHandler,
} from "@/testing/api-mocks/RequestHandlers";
import { getRouter, Router } from "@/testing/router.tsx";
import { overrideOnce, server } from "@/testing/server";
import { expectConflictErrorPage, screen, setupTestRouter, within } from "@/testing/test-utils";
import { TestUserProvider } from "@/testing/TestUserProvider";
import { CommitteeSessionListResponse, ElectionDetailsResponse, ErrorResponse } from "@/types/generated/openapi";

const Providers = ({
  children,
  router = getRouter(children),
  fetchInitialUser = false,
}: {
  children?: React.ReactNode;
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
      ,
    </ApiProvider>
  );
};

function renderWithRouter() {
  const router = setupTestRouter([
    {
      path: "/",
      Component: null,
      children: [
        {
          path: "elections/:electionId",
          children: electionManagementRoutes,
        },
      ],
    },
  ]);
  rtlRender(<Providers router={router} />);
  return router;
}

describe("ElectionHomePage", () => {
  beforeEach(() => {
    server.use(ElectionCommitteeSessionListRequestHandler);
  });

  test("Shows committee session card(s) and election information table", async () => {
    server.use(ElectionRequestHandler);
    overrideOnce("get", "/api/elections/1/status", 200, {
      statuses: [],
    });

    const router = renderWithRouter();
    await router.navigate("/elections/1");

    expect(await screen.findByRole("heading", { level: 1, name: "Gemeenteraadsverkiezingen 2026" })).toBeVisible();
    expect(
      await screen.findByRole("heading", { level: 2, name: "Gemeentelijk stembureau 0035 Heemdamseburg" }),
    ).toBeVisible();

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
      ["Stembureaus", "8 stembureaus"],
      ["Type stemopneming", "Centrale stemopneming"],
    ]);
  });

  test("Shows error page when start election call returns an error", async () => {
    // Since we test what happens after an error, we want vitest to ignore them
    vi.spyOn(console, "error").mockImplementation(() => {
      /* do nothing */
    });
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
    overrideOnce("get", "/api/elections/1/status", 200, {
      statuses: [],
    });
    overrideOnce("put", "/api/committee_sessions/2/status", 409, {
      error: "Wrong committee session status",
      fatal: true,
      reference: "WrongCommitteeSessionStatus",
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
    expect(within(committee_session_cards).getByText("— Klaar voor steminvoer")).toBeInTheDocument();
    expect(within(committee_session_cards).getByText("Eerste zitting")).toBeVisible();
    expect(within(committee_session_cards).getByText("— Steminvoer afgerond")).toBeInTheDocument();

    const startButton = screen.getByRole("button", { name: "Start steminvoer" });
    expect(startButton).toBeVisible();

    await user.click(startButton);

    await expectConflictErrorPage();
  });

  test("Shows alert when there are no polling stations", async () => {
    const electionData = getElectionMockData();
    electionData.polling_stations = [];
    server.use(
      http.get("/api/elections/1", () =>
        HttpResponse.json(electionData satisfies ElectionDetailsResponse, { status: 200 }),
      ),
    );
    overrideOnce("get", "/api/elections/1/status", 200, {
      statuses: [],
    });

    const router = renderWithRouter();
    await router.navigate("/elections/1");

    expect(await screen.findByRole("heading", { level: 1, name: "Gemeenteraadsverkiezingen 2026" })).toBeVisible();
    expect(
      await screen.findByRole("heading", { level: 2, name: "Gemeentelijk stembureau 0035 Heemdamseburg" }),
    ).toBeVisible();

    const alert = await screen.findByRole("alert");
    expect(within(alert).getByText("Geen stembureaus")).toBeVisible();
    expect(
      within(alert).getByText("De invoerfase kan pas gestart worden als er stembureaus zijn toegevoegd."),
    ).toBeVisible();
    expect(within(alert).getByRole("link", { name: "Stembureaus beheren" })).toBeVisible();

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

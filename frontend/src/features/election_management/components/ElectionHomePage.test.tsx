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
import { getCommitteeSessionListMockData } from "@/testing/api-mocks/CommitteeSessionMockData";
import { getElectionMockData } from "@/testing/api-mocks/ElectionMockData";
import {
  CommitteeSessionCreateHandler,
  CommitteeSessionDeleteHandler,
  ElectionRequestHandler,
} from "@/testing/api-mocks/RequestHandlers";
import { getRouter, Router } from "@/testing/router";
import { overrideOnce, server } from "@/testing/server";
import { expectConflictErrorPage, render, screen, setupTestRouter, spyOnHandler, within } from "@/testing/test-utils";
import { TestUserProvider } from "@/testing/TestUserProvider";
import { CommitteeSession, ElectionDetailsResponse, ErrorResponse, Role } from "@/types/generated/openapi";

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
  expect(await screen.findByRole("heading", { level: 2, name: "Gemeentelijk stembureau Heemdamseburg" })).toBeVisible();
};

describe("ElectionHomePage", () => {
  beforeEach(() => {
    overrideOnce("get", "/api/elections/1/status", 200, {
      statuses: [],
    });
  });

  test("Shows committee session card(s) and election information table", async () => {
    const committeeSessionData: Partial<CommitteeSession> = {
      status: "data_entry_in_progress",
      location: "Den Haag",
      start_date_time: "2026-03-18T21:36:00",
    };
    const electionData = getElectionMockData({}, committeeSessionData);
    electionData.committee_sessions = getCommitteeSessionListMockData(committeeSessionData);
    server.use(
      http.get("/api/elections/1", () =>
        HttpResponse.json(electionData satisfies ElectionDetailsResponse, { status: 200 }),
      ),
    );

    await renderPage("coordinator");

    const committee_session_cards = await screen.findByTestId("committee-session-cards");
    expect(committee_session_cards).toBeVisible();

    expect(within(committee_session_cards).getByTestId("session-4")).toHaveTextContent(
      /Vierde zitting — Steminvoer bezig/,
    );
    expect(within(committee_session_cards).getByTestId("session-3")).toHaveTextContent(
      /Derde zitting — Steminvoer afgerond/,
    );
    expect(within(committee_session_cards).getByTestId("session-2")).toHaveTextContent(
      /Tweede zitting — Steminvoer afgerond/,
    );
    expect(within(committee_session_cards).getByTestId("session-1")).toHaveTextContent(
      /Eerste zitting — Steminvoer afgerond/,
    );

    expect(screen.queryByRole("button", { name: "Nieuwe zitting voorbereiden" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Zitting verwijderen" })).not.toBeInTheDocument();

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

    await renderPage("coordinator");

    const committee_session_cards = await screen.findByTestId("committee-session-cards");
    expect(committee_session_cards).toBeVisible();
    expect(within(committee_session_cards).getByTestId("session-1")).toHaveTextContent(
      /Eerste zitting — Steminvoer afgerond/,
    );
    expect(screen.queryByRole("button", { name: "Zitting verwijderen" })).not.toBeInTheDocument();

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

    expect(sessionCreateRequestSpy).toHaveBeenCalledOnce();
  });

  test("Does not show create new committee session button for administrator", async () => {
    const electionData = getElectionMockData({}, { status: "data_entry_finished" });
    server.use(
      http.get("/api/elections/1", () =>
        HttpResponse.json(electionData satisfies ElectionDetailsResponse, { status: 200 }),
      ),
    );

    await renderPage("administrator");

    const committee_session_cards = await screen.findByTestId("committee-session-cards");
    expect(committee_session_cards).toBeVisible();
    expect(within(committee_session_cards).getByTestId("session-1")).toHaveTextContent(
      /Eerste zitting — Steminvoer afgerond/,
    );

    expect(screen.queryByRole("button", { name: "Nieuwe zitting voorbereiden" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Zitting verwijderen" })).not.toBeInTheDocument();

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

  describe("Delete committee session", () => {
    test("Shows button for coordinator", async () => {
      const committeeSessionData: Partial<CommitteeSession> = { id: 4, number: 4, status: "created" };
      const electionData = getElectionMockData({}, committeeSessionData);
      server.use(
        http.get("/api/elections/1", () =>
          HttpResponse.json(electionData satisfies ElectionDetailsResponse, { status: 200 }),
        ),
      );

      await renderPage("coordinator");

      const deleteButton = screen.getByRole("button", { name: "Zitting verwijderen" });
      expect(deleteButton).toBeVisible();
    });

    test("Doesn't show button for administrator", async () => {
      const committeeSessionData: Partial<CommitteeSession> = { id: 4, number: 4, status: "created" };
      const electionData = getElectionMockData({}, committeeSessionData);
      server.use(
        http.get("/api/elections/1", () =>
          HttpResponse.json(electionData satisfies ElectionDetailsResponse, { status: 200 }),
        ),
      );

      await renderPage("administrator");

      expect(screen.queryByRole("button", { name: "Zitting verwijderen" })).not.toBeInTheDocument();
    });

    test("With investigations, modal 'delete investigations first' is shown", async () => {
      const committeeSessionData: Partial<CommitteeSession> = { id: 4, number: 4, status: "created" };
      const electionData = getElectionMockData({}, committeeSessionData);
      server.use(
        http.get("/api/elections/1", () =>
          HttpResponse.json(electionData satisfies ElectionDetailsResponse, { status: 200 }),
        ),
      );

      await renderPage("coordinator");

      const user = userEvent.setup();
      const deleteButton = screen.getByRole("button", { name: "Zitting verwijderen" });
      await user.click(deleteButton);

      const modal = await screen.findByRole("dialog");
      const title = within(modal).getByText("Verwijder eerst onderzoeken");
      expect(title).toBeVisible();

      const viewInvestigations = within(modal).getByRole("button", { name: "Bekijk onderzoeken" });
      expect(viewInvestigations).toBeVisible();
    });

    test("Without investigations, modal 'are you sure' is shown", async () => {
      server.use(CommitteeSessionDeleteHandler);
      const sessionDeleteRequestSpy = spyOnHandler(CommitteeSessionDeleteHandler);

      const committeeSessionData: Partial<CommitteeSession> = { id: 4, number: 4, status: "created" };
      const electionData = getElectionMockData({}, committeeSessionData);
      electionData.investigations = [];
      server.use(
        http.get("/api/elections/1", () =>
          HttpResponse.json(electionData satisfies ElectionDetailsResponse, { status: 200 }),
        ),
      );

      await renderPage("coordinator");

      const user = userEvent.setup();
      const deleteButton = screen.getByRole("button", { name: "Zitting verwijderen" });
      await user.click(deleteButton);

      const modal = await screen.findByRole("dialog");
      const title = within(modal).getByText("Zitting verwijderen?");
      expect(title).toBeVisible();

      const confirmButton = within(modal).getByRole("button", { name: "Verwijder zitting" });
      expect(confirmButton).toBeVisible();
      await user.click(confirmButton);

      expect(sessionDeleteRequestSpy).toHaveBeenCalledOnce();
    });
  });

  test("Shows error page when start data entry call returns an error", async () => {
    // error is expected
    vi.spyOn(console, "error").mockImplementation(() => {});
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
    const committeeSessionData: Partial<CommitteeSession> = { status: "data_entry_not_started" };
    const electionData = getElectionMockData({}, committeeSessionData);
    electionData.committee_sessions = getCommitteeSessionListMockData(committeeSessionData);
    server.use(
      http.get("/api/elections/1", () =>
        HttpResponse.json(electionData satisfies ElectionDetailsResponse, { status: 200 }),
      ),
    );
    overrideOnce("put", "/api/elections/1/committee_sessions/4/status", 409, {
      error: "Invalid committee session status",
      fatal: true,
      reference: "InvalidCommitteeSessionStatus",
    } satisfies ErrorResponse);

    await router.navigate("/elections/1");

    rtlRender(<Providers router={router} />);

    expect(await screen.findByRole("heading", { level: 1, name: "Gemeenteraadsverkiezingen 2026" })).toBeVisible();
    expect(
      await screen.findByRole("heading", { level: 2, name: "Gemeentelijk stembureau Heemdamseburg" }),
    ).toBeVisible();

    const committee_session_cards = await screen.findByTestId("committee-session-cards");
    expect(committee_session_cards).toBeVisible();
    const session4 = within(committee_session_cards).getByTestId("session-4");
    expect(session4).toHaveTextContent(/Vierde zitting — Klaar voor invoer/);

    const startButton = within(session4).getByRole("button", { name: "Start steminvoer" });
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

  test("Shows empty documents section for first committee session", async () => {
    server.use(ElectionRequestHandler);

    await renderPage("coordinator");

    expect(
      await screen.findByRole("heading", { level: 3, name: "Lege processen-verbaal voor deze verkiezing" }),
    ).toBeVisible();
    expect(screen.getByText("Na 31-2 Bijlage 1")).toBeVisible();
    expect(screen.getByText("N 10-2")).toBeVisible();
  });

  test("Does not show empty documents section for second committee session", async () => {
    const electionDataSecondSession = getElectionMockData({}, { id: 2, number: 2 });
    electionDataSecondSession.committee_sessions = getCommitteeSessionListMockData().slice(2, 3);
    server.use(
      http.get("/api/elections/1", () =>
        HttpResponse.json(electionDataSecondSession satisfies ElectionDetailsResponse, { status: 200 }),
      ),
    );

    await renderPage("coordinator");

    expect(
      screen.queryByRole("heading", { level: 3, name: "Lege processen-verbaal voor deze verkiezing" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Na 31-2 Bijlage 1")).not.toBeInTheDocument();
  });
});

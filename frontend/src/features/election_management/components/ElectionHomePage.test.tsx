import { render as rtlRender } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import type { ReactNode } from "react";
import * as ReactRouter from "react-router";
import { RouterProvider } from "react-router";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { ApiProvider } from "@/api/ApiProvider";
import { ErrorBoundary } from "@/components/error/ErrorBoundary";
import { electionManagementRoutes } from "@/features/election_management/routes";
import { ElectionProvider } from "@/hooks/election/ElectionProvider";
import { ElectionStatusProvider } from "@/hooks/election/ElectionStatusProvider";
import {
  getCommitteeSessionListMockData,
  getCSBCommitteeSessionMockData,
} from "@/testing/api-mocks/CommitteeSessionMockData";
import { getCSBElectionMockData, getElectionMockData } from "@/testing/api-mocks/ElectionMockData";
import {
  CommitteeSessionCreateHandler,
  CommitteeSessionDeleteHandler,
  ElectionRequestHandler,
} from "@/testing/api-mocks/RequestHandlers";
import { getRouter, type Router } from "@/testing/router";
import { overrideOnce, server } from "@/testing/server";
import { TestUserProvider } from "@/testing/TestUserProvider";
import { expectConflictErrorPage, render, screen, setupTestRouter, spyOnHandler, within } from "@/testing/test-utils";
import type { CommitteeSession, ElectionDetailsResponse, ErrorResponse, Role } from "@/types/generated/openapi";
import { ElectionHomePage } from "./ElectionHomePage";

const navigate = vi.fn();

const renderGSBPage = async (userRole: Role) => {
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

const renderCSBPage = async () => {
  render(
    <TestUserProvider userRole={"coordinator_csb"}>
      <ElectionProvider electionId={2}>
        <ElectionStatusProvider electionId={2}>
          <ElectionHomePage />
        </ElectionStatusProvider>
      </ElectionProvider>
    </TestUserProvider>,
  );
  expect(await screen.findByRole("heading", { level: 1, name: "Gemeenteraadsverkiezingen 2026" })).toBeVisible();

  expect(await screen.findByRole("heading", { level: 2, name: "Centraal stembureau Heemdamseburg" })).toBeVisible();
};

describe("ElectionHomePage", () => {
  describe("GSB", () => {
    beforeEach(() => {
      overrideOnce("get", "/api/elections/1/status", 200, {
        statuses: [],
      });
    });

    test("Shows committee session card(s) and election information table", async () => {
      const committeeSessionData: Partial<CommitteeSession> = {
        status: "data_entry",
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

      await renderGSBPage("coordinator_gsb");

      const committee_session_cards = await screen.findByTestId("committee-session-cards");
      expect(committee_session_cards).toBeVisible();

      expect(within(committee_session_cards).getByTestId("session-4")).toHaveTextContent(
        /Vierde zitting — Invoer bezig/,
      );
      expect(within(committee_session_cards).getByTestId("session-3")).toHaveTextContent(
        /Derde zitting — Invoer afgerond/,
      );
      expect(within(committee_session_cards).getByTestId("session-2")).toHaveTextContent(
        /Tweede zitting — Invoer afgerond/,
      );
      expect(within(committee_session_cards).getByTestId("session-1")).toHaveTextContent(
        /Eerste zitting — Invoer afgerond/,
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
        ["Type stembureau", "Gemeentelijk stembureau"],
        ["Stembureaus", "8 stembureaus"],
        ["Type stemopneming", "Centrale stemopneming"],
      ]);
    });

    test("Shows create new committee session button and clicking it creates a new committee session", async () => {
      const user = userEvent.setup();
      server.use(CommitteeSessionCreateHandler);
      const sessionCreateRequestSpy = spyOnHandler(CommitteeSessionCreateHandler);
      const electionData = getElectionMockData({}, { status: "completed" });
      server.use(
        http.get("/api/elections/1", () =>
          HttpResponse.json(electionData satisfies ElectionDetailsResponse, { status: 200 }),
        ),
      );

      await renderGSBPage("coordinator_gsb");

      const committee_session_cards = await screen.findByTestId("committee-session-cards");
      expect(committee_session_cards).toBeVisible();
      expect(within(committee_session_cards).getByTestId("session-1")).toHaveTextContent(
        /Eerste zitting — Invoer afgerond/,
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
      const electionData = getElectionMockData({}, { status: "completed" });
      server.use(
        http.get("/api/elections/1", () =>
          HttpResponse.json(electionData satisfies ElectionDetailsResponse, { status: 200 }),
        ),
      );

      await renderGSBPage("administrator");

      const committee_session_cards = await screen.findByTestId("committee-session-cards");
      expect(committee_session_cards).toBeVisible();
      expect(within(committee_session_cards).getByTestId("session-1")).toHaveTextContent(
        /Eerste zitting — Invoer afgerond/,
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
        ["Type stembureau", "Gemeentelijk stembureau"],
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

        await renderGSBPage("coordinator_gsb");

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

        await renderGSBPage("administrator");

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

        await renderGSBPage("coordinator_gsb");

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

        await renderGSBPage("coordinator_gsb");

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
            <TestUserProvider userRole="coordinator_gsb">
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
      const committeeSessionData: Partial<CommitteeSession> = { status: "in_preparation" };
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

      const startButton = within(session4).getByRole("button", { name: "Start invoer" });
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

      await renderGSBPage("coordinator_gsb");

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
        ["Type stembureau", "Gemeentelijk stembureau"],
        ["Stembureaus", "0 stembureaus"],
        ["Type stemopneming", "Centrale stemopneming"],
      ]);
    });

    describe("CSO", () => {
      test("Shows empty documents section for first committee session", async () => {
        server.use(ElectionRequestHandler);

        await renderGSBPage("coordinator_gsb");

        expect(
          await screen.findByRole("heading", { level: 3, name: "Lege processen-verbaal voor deze verkiezing" }),
        ).toBeVisible();
        const downloadSection = screen.getByTestId("CSO-first-session-download-section");
        expect(downloadSection).toBeVisible();
        expect(within(downloadSection).getByRole("paragraph")).toHaveTextContent(
          "Onderstaande modellen zijn relevant voor de huidige zitting van het gemeentelijk stembureau. Overige modellen zijn te downloaden via de toolkit van de Kiesraad.",
        );
        const table = within(downloadSection).getByRole("table");
        expect(table).toBeVisible();
        expect(table).toHaveTableContent([
          ["Model", "Doel"],
          ["N 10-2", "Processen-verbaal per stembureau"],
          ["Na 31-2 Bijlage 1", "Verslagen van tellingen van stembureau"],
        ]);
      });

      test("Shows empty document section for second committee session", async () => {
        const electionDataSecondSession = getElectionMockData({}, { id: 2, number: 2 });
        electionDataSecondSession.committee_sessions = getCommitteeSessionListMockData().slice(2, 3);
        server.use(
          http.get("/api/elections/1", () =>
            HttpResponse.json(electionDataSecondSession satisfies ElectionDetailsResponse, { status: 200 }),
          ),
        );

        await renderGSBPage("coordinator_gsb");

        expect(
          await screen.findByRole("heading", { level: 3, name: "Leeg inlegvel voor deze verkiezing" }),
        ).toBeVisible();
        const downloadSection = screen.getByTestId("CSO-next-session-download-section");
        expect(downloadSection).toBeVisible();
        expect(within(downloadSection).getByRole("paragraph")).toHaveTextContent(
          "Onderstaand model is relevant voor de huidige zitting van het gemeentelijk stembureau. Overige modellen zijn te downloaden via de toolkit van de Kiesraad.",
        );
        const table = within(downloadSection).getByRole("table");
        expect(table).toBeVisible();
        expect(table).toHaveTableContent([
          ["Model", "Doel"],
          ["Na 31-2 inlegvel", "Inlegvel controles en correcties"],
        ]);
      });

      test("Shows empty document section for third committee session", async () => {
        const electionDataSecondSession = getElectionMockData({}, { id: 2, number: 3 });
        electionDataSecondSession.committee_sessions = getCommitteeSessionListMockData().slice(1, 3);
        server.use(
          http.get("/api/elections/1", () =>
            HttpResponse.json(electionDataSecondSession satisfies ElectionDetailsResponse, { status: 200 }),
          ),
        );

        await renderGSBPage("coordinator_gsb");

        expect(
          await screen.findByRole("heading", { level: 3, name: "Leeg inlegvel voor deze verkiezing" }),
        ).toBeVisible();
        const downloadSection = screen.getByTestId("CSO-next-session-download-section");
        expect(downloadSection).toBeVisible();
        expect(within(downloadSection).getByRole("paragraph")).toHaveTextContent(
          "Onderstaand model is relevant voor de huidige zitting van het gemeentelijk stembureau. Overige modellen zijn te downloaden via de toolkit van de Kiesraad.",
        );
        const table = within(downloadSection).getByRole("table");
        expect(table).toBeVisible();
        expect(table).toHaveTableContent([
          ["Model", "Doel"],
          ["Na 31-2 inlegvel", "Inlegvel controles en correcties"],
        ]);
      });
    });

    describe("DSO", () => {
      test("Shows empty documents section for first committee session", async () => {
        const electionDataSecondSession = getElectionMockData({ counting_method: "DSO" });
        vi.spyOn(ReactRouter, "useNavigate").mockImplementation(() => navigate);
        server.use(
          http.get("/api/elections/1", () =>
            HttpResponse.json(electionDataSecondSession satisfies ElectionDetailsResponse, { status: 200 }),
          ),
        );

        await renderGSBPage("coordinator_gsb");

        expect(
          await screen.findByRole("heading", { level: 3, name: "Lege processen-verbaal voor deze verkiezing" }),
        ).toBeVisible();
        const downloadSection = screen.getByTestId("DSO-first-session-download-section");
        expect(downloadSection).toBeVisible();
        expect(within(downloadSection).getByRole("paragraph")).toHaveTextContent(
          "Onderstaande modellen zijn relevant voor de huidige zitting van het gemeentelijk stembureau. Overige modellen zijn te downloaden via de toolkit van de Kiesraad.",
        );
        const table = within(downloadSection).getByRole("table");
        expect(table).toBeVisible();
        expect(table).toHaveTableContent([
          ["Model", "Doel"],
          ["N 10-1", "Processen-verbaal per stembureau"],
          ["N 10-1", "Inlegvellen controles en correcties per stembureau"],
          ["Na 14-1, versie 1", "Corrigenda eerste zitting per stembureau"],
        ]);
      });

      test("Shows modal on clicking download Na 14-1 versie 1 when committee session details missing", async () => {
        const user = userEvent.setup();
        const electionDataSecondSession = getElectionMockData({ counting_method: "DSO" });
        vi.spyOn(ReactRouter, "useNavigate").mockImplementation(() => navigate);
        server.use(
          http.get("/api/elections/1", () =>
            HttpResponse.json(electionDataSecondSession satisfies ElectionDetailsResponse, { status: 200 }),
          ),
        );

        await renderGSBPage("coordinator_gsb");

        expect(
          await screen.findByRole("heading", { level: 3, name: "Lege processen-verbaal voor deze verkiezing" }),
        ).toBeVisible();
        const downloadSection = screen.getByTestId("DSO-first-session-download-section");
        expect(downloadSection).toBeVisible();
        expect(within(downloadSection).getByRole("paragraph")).toHaveTextContent(
          "Onderstaande modellen zijn relevant voor de huidige zitting van het gemeentelijk stembureau. Overige modellen zijn te downloaden via de toolkit van de Kiesraad.",
        );
        const table = within(downloadSection).getByRole("table");
        const rows = within(table).getAllByRole("row");
        await user.click(rows[3]!);

        const modal = await screen.findByRole("dialog");
        expect(modal).toBeVisible();
        const title = within(modal).getByText("Vul eerst de details van de zitting in");
        expect(title).toBeVisible();

        const enter_details_button = within(modal).getByRole("button", { name: "Details invullen" });
        expect(enter_details_button).toBeVisible();
        await user.click(enter_details_button);

        expect(navigate).toHaveBeenCalledExactlyOnceWith("details");
      });

      test("Does not show modal on clicking download Na 14-1 versie 1 when committee session details present", async () => {
        const user = userEvent.setup();
        const electionDataSecondSession = getElectionMockData(
          { counting_method: "DSO" },
          { location: "Den Haag", start_date_time: "2026-03-18T21:36:00" },
        );
        server.use(
          http.get("/api/elections/1", () =>
            HttpResponse.json(electionDataSecondSession satisfies ElectionDetailsResponse, { status: 200 }),
          ),
        );

        await renderGSBPage("coordinator_gsb");

        expect(
          await screen.findByRole("heading", { level: 3, name: "Lege processen-verbaal voor deze verkiezing" }),
        ).toBeVisible();
        const downloadSection = screen.getByTestId("DSO-first-session-download-section");
        expect(downloadSection).toBeVisible();
        expect(within(downloadSection).getByRole("paragraph")).toHaveTextContent(
          "Onderstaande modellen zijn relevant voor de huidige zitting van het gemeentelijk stembureau. Overige modellen zijn te downloaden via de toolkit van de Kiesraad.",
        );
        const table = within(downloadSection).getByRole("table");
        const rows = within(table).getAllByRole("row");
        await user.click(rows[3]!);

        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      });

      test("Shows empty document section for second committee session", async () => {
        const electionDataSecondSession = getElectionMockData({ counting_method: "DSO" }, { id: 2, number: 2 });
        electionDataSecondSession.committee_sessions = getCommitteeSessionListMockData().slice(2, 3);
        server.use(
          http.get("/api/elections/1", () =>
            HttpResponse.json(electionDataSecondSession satisfies ElectionDetailsResponse, { status: 200 }),
          ),
        );

        await renderGSBPage("coordinator_gsb");

        expect(
          await screen.findByRole("heading", { level: 3, name: "Lege inlegvellen voor deze verkiezing" }),
        ).toBeVisible();
        const downloadSection = screen.getByTestId("DSO-next-session-download-section");
        expect(downloadSection).toBeVisible();
        expect(within(downloadSection).getByRole("paragraph")).toHaveTextContent(
          "Onderstaande modellen zijn relevant voor de huidige zitting van het gemeentelijk stembureau. Overige modellen zijn te downloaden via de toolkit van de Kiesraad.",
        );
        const table = within(downloadSection).getByRole("table");
        expect(table).toBeVisible();
        expect(table).toHaveTableContent([
          ["Model", "Doel"],
          ["N 10-1", "Inlegvellen controles en correcties per stembureau"],
          ["Na 31-1 inlegvel", "Inlegvel controles en correcties bij GSB proces-verbaal"],
        ]);
      });

      test("Shows empty document section for third committee session", async () => {
        const electionDataSecondSession = getElectionMockData({ counting_method: "DSO" }, { id: 2, number: 3 });
        electionDataSecondSession.committee_sessions = getCommitteeSessionListMockData().slice(1, 3);
        server.use(
          http.get("/api/elections/1", () =>
            HttpResponse.json(electionDataSecondSession satisfies ElectionDetailsResponse, { status: 200 }),
          ),
        );

        await renderGSBPage("coordinator_gsb");

        expect(
          await screen.findByRole("heading", { level: 3, name: "Lege inlegvellen voor deze verkiezing" }),
        ).toBeVisible();
        const downloadSection = screen.getByTestId("DSO-next-session-download-section");
        expect(downloadSection).toBeVisible();
        expect(within(downloadSection).getByRole("paragraph")).toHaveTextContent(
          "Onderstaande modellen zijn relevant voor de huidige zitting van het gemeentelijk stembureau. Overige modellen zijn te downloaden via de toolkit van de Kiesraad.",
        );
        const table = within(downloadSection).getByRole("table");
        expect(table).toBeVisible();
        expect(table).toHaveTableContent([
          ["Model", "Doel"],
          ["N 10-1", "Inlegvellen controles en correcties per stembureau"],
          ["Na 31-1 inlegvel", "Inlegvel controles en correcties bij GSB proces-verbaal"],
        ]);
      });
    });
  });

  describe("CSB", () => {
    test("Shows committee session card and election information table", async () => {
      overrideOnce("get", "/api/elections/2/status", 200, {
        statuses: [],
      });

      const committeeSessionData: Partial<CommitteeSession> = {
        status: "data_entry",
        location: "Den Haag",
        start_date_time: "2026-03-18T21:36:00",
      };
      const electionData = getCSBElectionMockData({}, committeeSessionData);
      electionData.committee_sessions = [getCSBCommitteeSessionMockData(committeeSessionData)];
      server.use(
        http.get("/api/elections/2", () =>
          HttpResponse.json(electionData satisfies ElectionDetailsResponse, { status: 200 }),
        ),
      );

      await renderCSBPage();

      const committee_session_cards = await screen.findByTestId("committee-session-cards");
      expect(committee_session_cards).toBeVisible();

      expect(within(committee_session_cards).getByTestId("session-1")).toHaveTextContent(/Zitting CSB — Invoer bezig/);

      expect(screen.queryByRole("button", { name: "Nieuwe zitting voorbereiden" })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Zitting verwijderen" })).not.toBeInTheDocument();

      expect(await screen.findByRole("heading", { level: 3, name: "Over deze verkiezing" })).toBeVisible();
      const election_information_table = await screen.findByTestId("election-information-table");
      expect(election_information_table).toBeVisible();
      expect(election_information_table).toHaveTableContent([
        ["Verkiezing", "Gemeenteraadsverkiezingen 2026, 30 november"],
        ["Kiesgebied", "0035 - Gemeente Heemdamseburg"],
        ["Lijsten en kandidaten", "2 lijsten en 31 kandidaten"],
        ["Type stembureau", "Centraal stembureau"],
      ]);
    });

    test("Does not show create new committee session button on completed committee session", async () => {
      overrideOnce("get", "/api/elections/2/status", 200, {
        statuses: [],
      });

      const committeeSessionData: Partial<CommitteeSession> = {
        status: "completed",
        location: "Den Haag",
        start_date_time: "2026-03-18T21:36:00",
      };
      const electionData = getCSBElectionMockData({}, committeeSessionData);
      electionData.committee_sessions = [getCSBCommitteeSessionMockData(committeeSessionData)];
      server.use(
        http.get("/api/elections/2", () =>
          HttpResponse.json(electionData satisfies ElectionDetailsResponse, { status: 200 }),
        ),
      );

      await renderCSBPage();

      const committee_session_cards = await screen.findByTestId("committee-session-cards");
      expect(committee_session_cards).toBeVisible();

      expect(within(committee_session_cards).getByTestId("session-1")).toHaveTextContent(
        /Zitting CSB — Invoer afgerond/,
      );

      expect(screen.queryByRole("button", { name: "Nieuwe zitting voorbereiden" })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Zitting verwijderen" })).not.toBeInTheDocument();
    });
  });
});

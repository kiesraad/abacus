import { render as rtlRender } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import * as ReactRouter from "react-router";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { ErrorBoundary } from "@/components/error/ErrorBoundary";
import alertCls from "@/components/ui/Alert/Alert.module.css";
import { ElectionProvider } from "@/hooks/election/ElectionProvider";
import { getElectionMockData } from "@/testing/api-mocks/ElectionMockData";
import {
  GetApportionmentStateRequestHandler,
  RegisterDeceasedCandidatesRequestHandler,
  ResetApportionmentStateRequestHandler,
} from "@/testing/api-mocks/RequestHandlers";
import { Providers } from "@/testing/Providers";
import type { Router } from "@/testing/router";
import { overrideOnce, server } from "@/testing/server";
import {
  expectErrorPage,
  render,
  renderReturningRouter,
  screen,
  setupTestRouter,
  spyOnHandler,
  waitFor,
  within,
} from "@/testing/test-utils";
import type { ApportionmentState, ElectionApportionmentResponse, ErrorResponse } from "@/types/generated/openapi";
import { apportionmentRoutes } from "../routes";
import * as gte19SeatsAndP7 from "../testing/gte-19-seats-and-p7";
import * as lt19Seats from "../testing/lt-19-seats";
import * as lt19SeatsAndP7 from "../testing/lt-19-seats-and-p7";
import { ApportionmentPage } from "./ApportionmentPage";
import { ApportionmentProvider } from "./ApportionmentProvider";

const navigate = vi.fn();

const renderApportionmentPage = (electionId: number, withRouter: boolean) => {
  const component = (
    <ElectionProvider electionId={electionId}>
      <ApportionmentProvider electionId={electionId}>
        <ApportionmentPage />
      </ApportionmentProvider>
    </ElectionProvider>
  );
  if (withRouter) {
    return renderReturningRouter(component);
  } else {
    return render(component);
  }
};

describe("ApportionmentPage", () => {
  test.each(
    Object.values({
      Uninitialised: {
        state: { type: "Uninitialised" },
        expectAlert: false,
        expectRedirectTo: "/elections/3/apportionment/include-all-candidates",
      },
      RegisteringDeceasedCandidates: {
        state: { deceased_candidates: [], type: "RegisteringDeceasedCandidates" },
        expectAlert: false,
        expectRedirectTo: "/elections/3/apportionment/deceased-candidates",
      },
      DrawingLots: {
        state: {
          deceased_candidates: [],
          drawing_lots_required: {
            variant: "AbsoluteMajorityLargestRemainder",
            assign_to: 1,
            options: [2, 3],
            type: "ListDrawingLotsRequired",
          },
          candidates_drawn: [],
          lists_drawn: [],
          type: "DrawingLots",
        },
        expectAlert: false,
        expectRedirectTo: undefined,
      },
      Finalised: {
        state: { deceased_candidates: [], lists_drawn: [], candidates_drawn: [], type: "Finalised" },
        expectAlert: true,
        expectRedirectTo: undefined,
      },
    } satisfies Record<
      ApportionmentState["type"],
      { state: ApportionmentState; expectAlert: boolean; expectRedirectTo: string | undefined }
    >),
  )("Renders all seats assigned message only for finalised state and does not redirect for drawing lots and finalised state ($state.type)", async ({
    state,
    expectAlert,
    expectRedirectTo,
  }) => {
    vi.spyOn(ReactRouter, "useNavigate").mockImplementation(() => navigate);
    overrideOnce("get", "/api/elections/3", 200, getElectionMockData(lt19Seats.election, lt19Seats.committee_session));
    overrideOnce("post", "/api/elections/3/apportionment", 200, {
      seat_assignment: lt19Seats.seat_assignment,
      candidate_nomination: lt19Seats.candidate_nomination,
      election_summary: lt19Seats.election_summary,
      warnings: [],
    } satisfies ElectionApportionmentResponse);
    overrideOnce("get", "/api/elections/3/apportionment/state", 200, state);

    renderApportionmentPage(3, false);
    expect(await screen.findByRole("heading", { level: 1, name: "Zetelverdeling" })).toBeVisible();

    if (expectAlert) {
      const alert = await screen.findByRole("alert");
      expect(alert).toHaveTextContent("Alle zetels zijn toegewezen");
      expect(alert).toHaveTextContent(
        "Je kunt de zetelverdeling nu definitief maken en het proces-verbaal downloaden.",
      );
      expect(within(alert).getByRole("link", { name: "Naar proces-verbaal" })).toHaveAttribute(
        "href",
        "/report/committee-session/3/download",
      );
      expect(within(alert).getByRole("button", { name: "Zetelverdeling opnieuw doen" })).toBeVisible();
    } else {
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    }

    if (expectRedirectTo) {
      await waitFor(() => {
        expect(navigate).toHaveBeenCalledWith(expectRedirectTo);
      });
    } else {
      expect(navigate).not.toHaveBeenCalled();
    }
  });

  test("Renders number of deceased candidates and redirects on clicking manage deceased candidates", async () => {
    const user = userEvent.setup();
    overrideOnce("get", "/api/elections/3", 200, getElectionMockData(lt19Seats.election, lt19Seats.committee_session));
    overrideOnce("post", "/api/elections/3/apportionment", 200, {
      seat_assignment: lt19Seats.seat_assignment,
      candidate_nomination: lt19Seats.candidate_nomination,
      election_summary: lt19Seats.election_summary,
      warnings: [],
    } satisfies ElectionApportionmentResponse);
    server.use(GetApportionmentStateRequestHandler);
    server.use(RegisterDeceasedCandidatesRequestHandler);
    overrideOnce("get", "/api/elections/3/apportionment/state", 200, {
      deceased_candidates: [{ pg_number: 1, candidate_number: 1 }],
      lists_drawn: [],
      candidates_drawn: [],
      type: "Finalised",
    } satisfies ApportionmentState);

    const router = renderApportionmentPage(3, true) as Router;

    expect(await screen.findByRole("heading", { level: 1, name: "Zetelverdeling" })).toBeVisible();

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Alle zetels zijn toegewezen");
    expect(alert).toHaveTextContent("Je kunt de zetelverdeling nu definitief maken en het proces-verbaal downloaden.");
    // No warnings, so the finalised alert should be a success alert
    expect(alert).toHaveClass(alertCls.success!);
    expect(within(alert).getByRole("link", { name: "Naar proces-verbaal" })).toHaveAttribute(
      "href",
      "/report/committee-session/3/download",
    );
    expect(within(alert).getByRole("button", { name: "Zetelverdeling opnieuw doen" })).toBeVisible();

    expect(await screen.findByRole("heading", { level: 2, name: "Kengetallen" })).toBeVisible();
    const election_summary_table = await screen.findByTestId("election-summary-table");
    expect(election_summary_table).toBeVisible();
    expect(election_summary_table).toHaveTableContent([
      ["Kiesgerechtigden", "2.000", ""],
      ["Getelde stembiljetten", "1.205", "Opkomst: 60,25%"],
      ["Blanco stemmen", "3", "0,25%"],
      ["Ongeldige stemmen", "2", "0,17%"],
      ["Totaal stemmen op kandidaten", "1.200", ""],
      ["Aantal raadszetels", "15", ""],
      ["Kiesdeler", "80", "Benodigde stemmen per volle zetel"],
      ["Voorkeursdrempel", "40", "50% van de kiesdeler"],
      ["Kandidaten voor zetelverdeling", "44 - 1 † = 43", "Beheer overleden kandidaten"],
    ]);

    // Check if the link to the deceased candidates page works
    const rows = within(election_summary_table).getAllByRole("row");
    if (rows[8]) {
      const manageLink = await within(rows[8]).findByRole("link", { name: "Beheer overleden kandidaten" });
      await user.click(manageLink);
      expect(router.state.location.pathname).toEqual("/elections/3/apportionment/deceased-candidates");
    }
  });

  test("Election summary and apportionment tables visible", async () => {
    const user = userEvent.setup();
    overrideOnce("get", "/api/elections/3", 200, getElectionMockData(lt19Seats.election, lt19Seats.committee_session));
    overrideOnce("post", "/api/elections/3/apportionment", 200, {
      seat_assignment: lt19Seats.seat_assignment,
      candidate_nomination: lt19Seats.candidate_nomination,
      election_summary: lt19Seats.election_summary,
      warnings: [],
    } satisfies ElectionApportionmentResponse);
    overrideOnce("get", "/api/elections/3/apportionment/state", 200, {
      deceased_candidates: [],
      lists_drawn: [],
      candidates_drawn: [],
      type: "Finalised",
    } satisfies ApportionmentState);

    const router = renderApportionmentPage(3, true) as Router;

    expect(await screen.findByRole("heading", { level: 1, name: "Zetelverdeling" })).toBeVisible();

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Alle zetels zijn toegewezen");
    expect(alert).toHaveTextContent("Je kunt de zetelverdeling nu definitief maken en het proces-verbaal downloaden.");
    // No warnings, so the finalised alert should be a success alert
    expect(alert).toHaveClass(alertCls.success!);
    expect(within(alert).getByRole("link", { name: "Naar proces-verbaal" })).toHaveAttribute(
      "href",
      "/report/committee-session/3/download",
    );
    expect(within(alert).getByRole("button", { name: "Zetelverdeling opnieuw doen" })).toBeVisible();

    expect(await screen.findByRole("heading", { level: 2, name: "Kengetallen" })).toBeVisible();
    const election_summary_table = await screen.findByTestId("election-summary-table");
    expect(election_summary_table).toBeVisible();
    expect(election_summary_table).toHaveTableContent([
      ["Kiesgerechtigden", "2.000", ""],
      ["Getelde stembiljetten", "1.205", "Opkomst: 60,25%"],
      ["Blanco stemmen", "3", "0,25%"],
      ["Ongeldige stemmen", "2", "0,17%"],
      ["Totaal stemmen op kandidaten", "1.200", ""],
      ["Aantal raadszetels", "15", ""],
      ["Kiesdeler", "80", "Benodigde stemmen per volle zetel"],
      ["Voorkeursdrempel", "40", "50% van de kiesdeler"],
      ["Kandidaten voor zetelverdeling", "44 - 0 † = 44", "Beheer overleden kandidaten"],
    ]);

    expect(await screen.findByRole("heading", { level: 2, name: "Zetelverdeling" })).toBeVisible();
    const apportionment_table = await screen.findByTestId("apportionment-table");
    expect(apportionment_table).toBeVisible();
    expect(apportionment_table).toHaveTableContent([
      ["Lijst", "Lijstnaam", "Volle zetels", "Restzetels", "Totaal zetels"],
      ["1", "Political Group A", "10", "2", "12"],
      ["2", "Political Group B", "-", "1", "1"],
      ["3", "Political Group C", "-", "1", "1"],
      ["4", "Political Group D", "-", "1", "1"],
      ["5", "Blanco (Smit, G.)", "-", "-", "-"],
      ["6", "Political Group F", "-", "-", "-"],
      ["7", "Political Group G", "-", "-", "-"],
      ["8", "Political Group H", "-", "-", "-"],
      ["", "Totaal", "10", "5", "15"],
    ]);

    const links = screen.getAllByRole("listitem");
    expect(links).toHaveLength(2);
    expect(links[0]).toHaveTextContent("10 zetels werden als volle zetel toegewezen");
    expect(within(links[0] as HTMLElement).getByRole("link", { name: "bekijk details" })).toHaveAttribute(
      "href",
      "/details-full-seats",
    );
    expect(links[1]).toHaveTextContent("5 zetels werden als restzetel toegewezen");
    expect(within(links[1] as HTMLElement).getByRole("link", { name: "bekijk details" })).toHaveAttribute(
      "href",
      "/details-residual-seats",
    );

    expect(await screen.findByRole("heading", { level: 2, name: "Gekozen kandidaten" })).toBeVisible();
    const chosen_candidates_table = await screen.findByTestId("chosen-candidates-table");
    expect(chosen_candidates_table).toBeVisible();
    expect(chosen_candidates_table).toHaveTableContent([
      ["Naam", "Woonplaats", "Lijst"],
      ["Bakker, S. (Sophie) (v)", "Test Location", "Lijst 1 - Political Group A"],
      ["Bakker, T. (Tinus) (m)", "Test Location (BE)", "Lijst 2 - Political Group B"],
      ["Van den Berg, M. (Marijke) (v)", "Test Location", "Lijst 1 - Political Group A"],
      ["Bogaert, G. (Gerard) (m)", "Test Location", "Lijst 4 - Political Group D"],
      ["Van Doorn, A. (Adelbert) (m)", "Test Location", "Lijst 3 - Political Group C"],
      ["Jansen, A. (Arie) (m)", "Test Location", "Lijst 1 - Political Group A"],
      ["De Jong, R. (Rolf) (m)", "Test Location", "Lijst 1 - Political Group A"],
      ["Kok, K. (Karin) (v)", "Test Location", "Lijst 1 - Political Group A"],
      ["Oud, J. (Johan) (m)", "Test Location", "Lijst 1 - Political Group A"],
      ["Oud, K. (Klaas) (m)", "Test Location", "Lijst 1 - Political Group A"],
      ["Oud, L. (Lidewij) (v)", "Test Location", "Lijst 1 - Political Group A"],
      ["Oud, M. (Marijke) (v)", "Test Location", "Lijst 1 - Political Group A"],
      ["De Vries, J. (Johan) (m)", "Test Location", "Lijst 1 - Political Group A"],
      ["Van der Weijden, B. (Berta) (v)", "Test Location (BE)", "Lijst 1 - Political Group A"],
      ["Van der Weijden, H. (Henk) (m)", "Test Location", "Lijst 1 - Political Group A"],
    ]);

    // Check if the link to the list details page works
    const rows = within(apportionment_table).getAllByRole("row");
    if (rows[1]) {
      await user.click(rows[1]);
    }
    expect(router.state.location.pathname).toEqual("/1");
  });

  test("Renders yellow warning when finalised but not all seats assigned and clicks reset button", async () => {
    const user = userEvent.setup();
    server.use(GetApportionmentStateRequestHandler);
    server.use(ResetApportionmentStateRequestHandler);
    const resetApportionmentState = spyOnHandler(ResetApportionmentStateRequestHandler);
    const getApportionmentState = spyOnHandler(GetApportionmentStateRequestHandler);
    overrideOnce("get", "/api/elections/3", 200, getElectionMockData(lt19Seats.election, lt19Seats.committee_session));
    server.use(
      http.post("/api/elections/3/apportionment", () =>
        HttpResponse.json(
          {
            seat_assignment: lt19Seats.seat_assignment,
            candidate_nomination: lt19Seats.candidate_nomination,
            election_summary: lt19Seats.election_summary,
            warnings: ["NotAllSeatsAssigned"],
          } satisfies ElectionApportionmentResponse,
          { status: 200 },
        ),
      ),
    );
    overrideOnce("get", "/api/elections/3/apportionment/state", 200, {
      deceased_candidates: [],
      lists_drawn: [],
      candidates_drawn: [],
      type: "Finalised",
    } satisfies ApportionmentState);

    renderApportionmentPage(3, false);

    const alerts = await screen.findAllByRole("alert");
    expect(alerts).toHaveLength(2);
    expect(alerts[0]).toHaveTextContent("Niet alle zetels zijn toegewezen");
    alerts.forEach((alert) => {
      expect(alert).not.toHaveTextContent("Alle zetels zijn toegewezen");
    });

    const finalisedAlert = alerts[1] as HTMLElement;
    await user.click(within(finalisedAlert).getByRole("button", { name: "Zetelverdeling opnieuw doen" }));
    expect(resetApportionmentState).toHaveBeenCalled();
    expect(getApportionmentState).toHaveBeenCalled();
  });

  test("Renders P9+P10 warning when both articles were applied", async () => {
    overrideOnce("get", "/api/elections/3", 200, getElectionMockData(lt19Seats.election, lt19Seats.committee_session));
    overrideOnce("post", "/api/elections/3/apportionment", 200, {
      seat_assignment: lt19Seats.seat_assignment,
      candidate_nomination: lt19Seats.candidate_nomination,
      election_summary: lt19Seats.election_summary,
      warnings: ["AbsoluteMajorityAndListExhaustion"],
    } satisfies ElectionApportionmentResponse);
    overrideOnce("get", "/api/elections/3/apportionment/state", 200, {
      deceased_candidates: [],
      lists_drawn: [],
      candidates_drawn: [],
      type: "Finalised",
    } satisfies ApportionmentState);

    renderApportionmentPage(3, false);
    expect(await screen.findByTestId("election-summary-table")).toBeVisible();

    const alerts = await screen.findAllByRole("alert");
    expect(alerts).toHaveLength(2);
    expect(alerts[0]).toHaveTextContent(
      "Zowel art. P 9 (volstrekte meerderheid) als art. P 10 (lijstuitputting) van de Kieswet zijn toegepast tijdens het berekenen van de zetelverdeling. Neem contact op met de Kiesraad om te overleggen of er extra controles nodig zijn.",
    );
    expect(alerts[1]).toHaveTextContent("Alle zetels zijn toegewezen");
    // Finalised alert should be neutral (not success) because there is a warning
    expect(alerts[1]).toHaveClass(alertCls.notify!);
    expect(alerts[1]).not.toHaveClass(alertCls.success!);
  });

  describe("Apportionment not yet available", () => {
    beforeEach(() => {
      overrideOnce(
        "get",
        "/api/elections/3",
        200,
        getElectionMockData(lt19Seats.election, lt19Seats.committee_session),
      );
      overrideOnce("get", "/api/elections/3/apportionment/state", 200, {
        type: "Uninitialised",
      } satisfies ApportionmentState);
    });

    test("Not available until committee session is completed", async () => {
      overrideOnce("post", "/api/elections/3/apportionment", 412, {
        error: "Committee session not completed",
        fatal: false,
        reference: "ApportionmentCommitteeSessionNotCompleted",
      } satisfies ErrorResponse);

      renderApportionmentPage(3, false);

      // Wait for the page to be loaded
      expect(await screen.findByRole("heading", { level: 1, name: "Zetelverdeling" })).toBeVisible();

      expect(await screen.findByText("Zetelverdeling is nog niet beschikbaar")).toBeVisible();
      expect(
        await screen.findByText("De zetelverdeling kan pas gemaakt worden als de zitting is afgerond"),
      ).toBeVisible();

      expect(screen.queryByText("Alle zetels zijn toegewezen")).not.toBeInTheDocument();
      expect(screen.queryByTestId("election-summary-table")).not.toBeInTheDocument();
      expect(screen.queryByTestId("apportionment-table")).not.toBeInTheDocument();
      expect(screen.queryByTestId("chosen-candidates-table")).not.toBeInTheDocument();
    });

    test("Not possible because committee session is not completed yet", async () => {
      overrideOnce("post", "/api/elections/3/apportionment", 412, {
        error: "Committee session not completed",
        fatal: false,
        reference: "ApportionmentCommitteeSessionNotCompleted",
      } satisfies ErrorResponse);

      renderApportionmentPage(3, false);

      // Wait for the page to be loaded
      expect(await screen.findByRole("heading", { level: 1, name: "Zetelverdeling" })).toBeVisible();

      expect(await screen.findByText("Zetelverdeling is nog niet beschikbaar")).toBeVisible();
      expect(
        await screen.findByText("De zetelverdeling kan pas gemaakt worden als de zitting is afgerond"),
      ).toBeVisible();

      expect(screen.queryByText("Alle zetels zijn toegewezen")).not.toBeInTheDocument();
      expect(screen.queryByTestId("election-summary-table")).not.toBeInTheDocument();
      expect(screen.queryByTestId("apportionment-table")).not.toBeInTheDocument();
      expect(screen.queryByTestId("chosen-candidates-table")).not.toBeInTheDocument();
    });

    test("Internal Server Error renders error page", async () => {
      // error is expected
      vi.spyOn(console, "error").mockImplementation(() => {});
      const router = setupTestRouter([
        {
          Component: null,
          errorElement: <ErrorBoundary />,
          children: [
            {
              path: "elections/:electionId/apportionment",
              children: apportionmentRoutes,
            },
          ],
        },
      ]);

      overrideOnce("post", "/api/elections/3/apportionment", 500, {
        error: "Internal Server Error",
        fatal: true,
        reference: "InternalServerError",
      });

      await router.navigate("/elections/3/apportionment");

      rtlRender(<Providers router={router} />);

      await expectErrorPage();
    });
  });

  describe("Drawing lots residual seats", () => {
    test("Render alert drawing lots required and table for LargestRemainderResidualSeat", async () => {
      const user = userEvent.setup();
      overrideOnce(
        "get",
        "/api/elections/7",
        200,
        getElectionMockData(lt19SeatsAndP7.election, lt19SeatsAndP7.committee_session),
      );
      overrideOnce("post", "/api/elections/7/apportionment", 200, {
        seat_assignment: lt19SeatsAndP7.seat_assignment,
        election_summary: lt19SeatsAndP7.election_summary,
      });
      overrideOnce("get", "/api/elections/7/apportionment/state", 200, lt19SeatsAndP7.state);

      const router = renderApportionmentPage(7, true) as Router;
      expect(await screen.findByRole("heading", { level: 1, name: "Zetelverdeling" })).toBeVisible();

      const alerts = await screen.findAllByRole("alert");
      expect(alerts).toHaveLength(2);

      expect(alerts[0]).toHaveClass(alertCls.warning!);
      expect(alerts[0]).toHaveTextContent(
        [
          "Loting noodzakelijk voor toekennen restzetel 2",
          `Er is een restzetel te verdelen. In de wet staat dat de partij met het grootste overschot aan stemmen per toegewezen zetel deze krijgt.`,
          "Er zijn meerdere partijen die hetzelfde grootste overschot hebben.",
          "Hierdoor kan de restzetel niet automatisch worden toegewezen. Het centraal stembureau moet een loting uitvoeren om de restzetel toe te wijzen.",
          "Naar loting",
          "Details restzetelverdeling",
        ].join(""),
      );

      expect(alerts[1]).toHaveClass(alertCls.notify!);
      expect(alerts[1]).toHaveTextContent("Er is nog 1 restzetel te verdelen. Bekijk details");

      const apportionment_table = await screen.findByTestId("apportionment-table");
      expect(apportionment_table).toBeVisible();
      expect(apportionment_table).toHaveTableContent([
        ["Lijst", "Lijstnaam", "Volle zetels", "Restzetels", "Totaal zetels"],
        ["", "Nog niet toegewezen", "-", "1", "1"],
        ["1", "Stemmersgroep", "6", "1", "7"],
        ["2", "Politieke Groep der Kandidaten", "2", "-", "2"],
        ["3", "Stemalliantie", "2", "-", "2"],
        ["4", "Stem voor de Partij", "1", "-", "1"],
        ["5", "Alliantie van Partijen", "1", "-", "1"],
        ["6", "Unie voor Stemmen", "1", "-", "1"],
        ["7", "Stem nu!", "-", "-", "-"],
        ["8", "Politieke Groep de Partij", "-", "-", "-"],
        ["", "Totaal", "13", "2", "15"],
      ]);

      // Check that there are no links to the list details pages
      const rows = within(apportionment_table).getAllByRole("row");
      if (rows[2]) {
        await user.click(rows[2]);
      }
      expect(router.state.location.pathname).toEqual("/");

      // Check that the first row links to the residual seat page
      if (rows[1]) {
        await user.click(rows[1]);
      }
      expect(router.state.location.pathname).toEqual("/details-residual-seats");
    });

    test("Render alert drawing lots required and table for HighestAverageResidualSeat", async () => {
      const user = userEvent.setup();
      overrideOnce(
        "get",
        "/api/elections/8",
        200,
        getElectionMockData(gte19SeatsAndP7.election, gte19SeatsAndP7.committee_session),
      );
      overrideOnce("post", "/api/elections/8/apportionment", 200, {
        seat_assignment: gte19SeatsAndP7.seat_assignment,
        election_summary: gte19SeatsAndP7.election_summary,
      });
      overrideOnce("get", "/api/elections/8/apportionment/state", 200, gte19SeatsAndP7.state);

      const router = renderApportionmentPage(8, true) as Router;
      expect(await screen.findByRole("heading", { level: 1, name: "Zetelverdeling" })).toBeVisible();

      const alerts = await screen.findAllByRole("alert");
      expect(alerts).toHaveLength(2);

      expect(alerts[0]).toHaveClass(alertCls.warning!);
      expect(alerts[0]).toHaveTextContent(
        [
          "Loting noodzakelijk voor toekennen restzetels 2, 3 en 4",
          `Er is een restzetel te verdelen. In de wet staat dat de partij met het grootste gemiddeld aantal stemmen per toegewezen zetel deze krijgt.`,
          "Er zijn meerdere partijen die na het toewijzen van de volgende restzetel precies hetzelfde hoogste gemiddelde krijgen.",
          "Hierdoor kan de restzetel niet automatisch worden toegewezen. Het centraal stembureau moet een loting uitvoeren om de restzetel toe te wijzen.",
          "Naar loting",
          "Details restzetelverdeling",
        ].join(""),
      );

      expect(alerts[1]).toHaveClass(alertCls.notify!);
      expect(alerts[1]).toHaveTextContent("Er zijn nog 3 restzetels te verdelen. Bekijk details");

      const apportionment_table = await screen.findByTestId("apportionment-table");
      expect(apportionment_table).toBeVisible();
      expect(apportionment_table).toHaveTableContent([
        ["Lijst", "Lijstnaam", "Volle zetels", "Restzetels", "Totaal zetels"],
        ["", "Nog niet toegewezen", "-", "3", "3"],
        ["1", "Partij voor de Stemmer", "9", "1", "10"],
        ["2", "Algemene Partij", "2", "-", "2"],
        ["3", "KEUS", "2", "-", "2"],
        ["4", "Algemene Lijst", "2", "-", "2"],
        ["5", "Unie van kandidaten", "2", "-", "2"],
        ["6", "Lijst van stemmers", "2", "-", "2"],
        ["", "Totaal", "19", "4", "23"],
      ]);

      // Check that there are no links to the list details pages
      const rows = within(apportionment_table).getAllByRole("row");
      if (rows[2]) {
        await user.click(rows[2]);
      }
      expect(router.state.location.pathname).toEqual("/");

      // Check that the first row links to the residual seat page
      if (rows[1]) {
        await user.click(rows[1]);
      }
      expect(router.state.location.pathname).toEqual("/details-residual-seats");
    });

    test("Render alert drawing lots required and alert assigned after drawing lots", async () => {
      overrideOnce(
        "get",
        "/api/elections/8",
        200,
        getElectionMockData(gte19SeatsAndP7.election, gte19SeatsAndP7.committee_session),
      );
      overrideOnce("post", "/api/elections/8/apportionment", 200, {
        seat_assignment: gte19SeatsAndP7.seat_assignment_after_one_drawing_lots_seat_assigned,
        election_summary: gte19SeatsAndP7.election_summary,
      });
      overrideOnce(
        "get",
        "/api/elections/8/apportionment/state",
        200,
        gte19SeatsAndP7.state_after_one_drawing_lots_seat_assigned,
      );

      renderApportionmentPage(8, false);
      expect(await screen.findByRole("heading", { level: 1, name: "Zetelverdeling" })).toBeVisible();

      const alerts = await screen.findAllByRole("alert");
      expect(alerts).toHaveLength(3);

      expect(alerts[0]).toHaveClass(alertCls.warning!);
      expect(alerts[0]).toHaveTextContent(
        [
          "Loting noodzakelijk voor toekennen restzetels 3 en 4",
          `Er is een restzetel te verdelen. In de wet staat dat de partij met het grootste gemiddeld aantal stemmen per toegewezen zetel deze krijgt.`,
          "Er zijn meerdere partijen die na het toewijzen van de volgende restzetel precies hetzelfde hoogste gemiddelde krijgen.",
          "Hierdoor kan de restzetel niet automatisch worden toegewezen. Het centraal stembureau moet een loting uitvoeren om de restzetel toe te wijzen.",
          "Naar loting",
          "Details restzetelverdeling",
        ].join(""),
      );

      expect(alerts[1]).toHaveClass(alertCls.notify!);
      expect(alerts[1]).toHaveTextContent("Er zijn nog 2 restzetels te verdelen. Bekijk details");

      expect(alerts[2]).toHaveClass(alertCls.notify!);
      expect(alerts[2]).toHaveTextContent(
        "Restzetel 2 kon niet automatisch worden toegewezen en is na loting toegekend aan Lijst 4 - Algemene Lijst.",
      );

      const apportionment_table = await screen.findByTestId("apportionment-table");
      expect(apportionment_table).toBeVisible();
      expect(apportionment_table).toHaveTableContent([
        ["Lijst", "Lijstnaam", "Volle zetels", "Restzetels", "Totaal zetels"],
        ["", "Nog niet toegewezen", "-", "2", "2"],
        ["1", "Partij voor de Stemmer", "9", "1", "10"],
        ["2", "Algemene Partij", "2", "-", "2"],
        ["3", "KEUS", "2", "-", "2"],
        ["4", "Algemene Lijst", "2", "1", "3"],
        ["5", "Unie van kandidaten", "2", "-", "2"],
        ["6", "Lijst van stemmers", "2", "-", "2"],
        ["", "Totaal", "19", "4", "23"],
      ]);
    });
  });
});

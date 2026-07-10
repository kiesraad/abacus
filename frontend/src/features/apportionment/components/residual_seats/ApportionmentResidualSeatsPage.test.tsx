import { render as rtlRender } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event/dist/cjs/index.js";
import * as ReactRouter from "react-router";
import { within } from "storybook/test";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { ErrorBoundary } from "@/components/error/ErrorBoundary";
import alertCls from "@/components/ui/Alert/Alert.module.css";
import { ElectionProvider } from "@/hooks/election/ElectionProvider";
import { getElectionMockData } from "@/testing/api-mocks/ElectionMockData";
import { Providers } from "@/testing/Providers";
import type { Router } from "@/testing/router";
import { overrideOnce } from "@/testing/server";
import { expectErrorPage, render, renderReturningRouter, screen, setupTestRouter, waitFor } from "@/testing/test-utils";
import type { ApportionmentState, ElectionApportionmentResponse, ErrorResponse } from "@/types/generated/openapi";
import { apportionmentRoutes } from "../../routes";
import * as gte19Seats from "../../testing/gte-19-seats";
import * as gte19SeatsAndP7DrawingLots from "../../testing/gte-19-seats-and-p7-drawing-lots";
import * as gte19SeatsAndP9 from "../../testing/gte-19-seats-and-p9";
import * as gte19SeatsAndP9DrawingLots from "../../testing/gte-19-seats-and-p9-drawing-lots-and-deceased-candidates";
import * as lt19Seats from "../../testing/lt-19-seats";
import * as lt19SeatsAndP7DrawingLots from "../../testing/lt-19-seats-and-p7-drawing-lots";
import * as lt19SeatsAndP9AndP10 from "../../testing/lt-19-seats-and-p9-and-p10";
import * as lt19SeatsAndP9DrawingLots from "../../testing/lt-19-seats-and-p9-drawing-lots";
import * as lt19SeatsAndP10 from "../../testing/lt-19-seats-and-p10";
import { ApportionmentProvider } from "../ApportionmentProvider";
import { ApportionmentResidualSeatsPage } from "./ApportionmentResidualSeatsPage";

const navigate = vi.fn();

const renderApportionmentResidualSeatsPage = (electionId: number, withRouter: boolean) => {
  const component = (
    <ElectionProvider electionId={electionId}>
      <ApportionmentProvider electionId={electionId}>
        <ApportionmentResidualSeatsPage />
      </ApportionmentProvider>
    </ElectionProvider>
  );
  if (withRouter) {
    return renderReturningRouter(component);
  } else {
    return render(component);
  }
};

describe("ApportionmentResidualSeatsPage", () => {
  test.each(
    Object.values({
      Uninitialised: {
        state: { type: "Uninitialised" },
        expectRedirectTo: "/elections/3/apportionment/include-all-candidates",
      },
      RegisteringDeceasedCandidates: {
        state: { deceased_candidates: [], type: "RegisteringDeceasedCandidates" },
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
        expectRedirectTo: undefined,
      },
      Finalised: {
        state: { deceased_candidates: [], lists_drawn: [], candidates_drawn: [], type: "Finalised" },
        expectRedirectTo: undefined,
      },
    } satisfies Record<
      ApportionmentState["type"],
      { state: ApportionmentState; expectRedirectTo: string | undefined }
    >),
  )("Does not redirect only for drawing lots and finalised state ($state.type)", async ({
    state,
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

    renderApportionmentResidualSeatsPage(3, false);
    expect(await screen.findByRole("heading", { level: 1, name: "Verdeling van de restzetels" })).toBeVisible();

    if (expectRedirectTo) {
      await waitFor(() => {
        expect(navigate).toHaveBeenCalledWith(expectRedirectTo);
      });
    } else {
      expect(navigate).not.toHaveBeenCalled();
    }
  });

  test("Residual seats assignment highest averages table visible", async () => {
    overrideOnce(
      "get",
      "/api/elections/2",
      200,
      getElectionMockData(gte19Seats.election, gte19Seats.committee_session),
    );
    overrideOnce("post", "/api/elections/2/apportionment", 200, {
      seat_assignment: gte19Seats.seat_assignment,
      candidate_nomination: gte19Seats.candidate_nomination,
      election_summary: gte19Seats.election_summary,
      warnings: [],
    } satisfies ElectionApportionmentResponse);
    overrideOnce("get", "/api/elections/2/apportionment/state", 200, {
      deceased_candidates: [],
      lists_drawn: [],
      candidates_drawn: [],
      type: "Finalised",
    } satisfies ApportionmentState);

    renderApportionmentResidualSeatsPage(2, false);

    expect(await screen.findByRole("heading", { level: 1, name: "Verdeling van de restzetels" })).toBeVisible();

    expect(
      await screen.findByRole("heading", {
        level: 2,
        name: "De restzetels gaan naar de partijen met de grootste gemiddelden",
      }),
    ).toBeVisible();
    const highest_averages_table = await screen.findByTestId("highest-averages-table");
    expect(highest_averages_table).toBeVisible();
    expect(highest_averages_table).toHaveTableContent([
      ["Lijst", "Lijstnaam", "Ronde 1", "Ronde 2", "Ronde 3", "Ronde 4", "Aantal restzetels"],
      ["1", "Political Group A", "50", "", "50", "", "50", "", "46", "2/13", "1"],
      ["2", "Political Group B", "50", "2/6", "50", "2/6", "43", "1/7", "43", "1/7", "1"],
      ["3", "Political Group C", "49", "", "49", "", "49", "", "49", "", "0"],
      ["4", "Political Group D", "49", "1/2", "49", "1/2", "49", "1/2", "49", "1/2", "1"],
      ["5", "Blanco (Smit, G.)", "50", "1/2", "33", "2/3", "33", "2/3", "33", "2/3", "1"],
      ["", "Restzetel toegekend aan lijst", "5", "2", "1", "4", ""],
    ]);

    expect(screen.queryByTestId("largest-remainders-table")).not.toBeInTheDocument();
    expect(screen.queryByTestId("unique-highest-averages-table")).not.toBeInTheDocument();
    expect(screen.queryByTestId("footnotes-list")).not.toBeInTheDocument();
  });

  test("Residual seats assignment highest averages table with footnotes and absolute majority change information visible", async () => {
    overrideOnce(
      "get",
      "/api/elections/5",
      200,
      getElectionMockData(gte19SeatsAndP9.election, gte19SeatsAndP9.committee_session),
    );
    overrideOnce("post", "/api/elections/5/apportionment", 200, {
      seat_assignment: gte19SeatsAndP9.seat_assignment,
      candidate_nomination: gte19SeatsAndP9.candidate_nomination,
      election_summary: gte19SeatsAndP9.election_summary,
      warnings: [],
    } satisfies ElectionApportionmentResponse);
    overrideOnce("get", "/api/elections/5/apportionment/state", 200, {
      deceased_candidates: [],
      lists_drawn: [],
      candidates_drawn: [],
      type: "Finalised",
    } satisfies ApportionmentState);

    renderApportionmentResidualSeatsPage(5, false);

    expect(await screen.findByRole("heading", { level: 1, name: "Verdeling van de restzetels" }));

    expect(
      await screen.findByRole("heading", {
        level: 2,
        name: "De restzetels gaan naar de partijen met de grootste gemiddelden",
      }),
    );
    const highest_averages_table = await screen.findByTestId("highest-averages-table");
    expect(highest_averages_table).toBeVisible();
    expect(highest_averages_table).toHaveTableContent([
      ["Lijst", "Lijstnaam", "Ronde 1", "Ronde 2", "Ronde 3", "Ronde 4", "Ronde 5", "Ronde 6", "Aantal restzetels"],
      ["1", "Political Group A", "577", "", "577", "", "577", "", "577", "", "577", "", "577", "", "1 1"],
      [
        "2",
        "Political Group B",
        "624",
        "1/2",
        "416",
        "1/3",
        "416",
        "1/3",
        "416",
        "1/3",
        "416",
        "1/3",
        "416",
        "1/3",
        "1",
      ],
      [
        "3",
        "Political Group C",
        "624",
        "1/2",
        "624",
        "1/2",
        "416",
        "1/3",
        "416",
        "1/3",
        "416",
        "1/3",
        "416",
        "1/3",
        "1",
      ],
      [
        "4",
        "Political Group D",
        "624",
        "1/2",
        "624",
        "1/2",
        "624",
        "1/2",
        "416",
        "1/3",
        "416",
        "1/3",
        "416",
        "1/3",
        "1",
      ],
      [
        "5",
        "Blanco (Jacobse, F.)",
        "624",
        "1/2",
        "624",
        "1/2",
        "624",
        "1/2",
        "624",
        "1/2",
        "416",
        "1/3",
        "416",
        "1/3",
        "1",
      ],
      [
        "6",
        "Political Group F",
        "624",
        "1/2",
        "624",
        "1/2",
        "624",
        "1/2",
        "624",
        "1/2",
        "624",
        "1/2",
        "416",
        "1/3",
        "1",
      ],
      ["7", "Political Group G", "624", "", "624", "", "624", "", "624", "", "624", "", "624", "", "1 0"],
      ["8", "Political Group H", "7", "", "7", "", "7", "", "7", "", "7", "", "7", "", "0"],
      ["", "Restzetel toegekend aan lijst", "2", "3", "4", "5", "6", "7", ""],
    ]);

    expect(await screen.findByTestId("footnotes-list")).toHaveTextContent(
      "Lijst 1 heeft meer dan de helft van alle uitgebrachte stemmen behaald, maar krijgt op basis van de standaard zetelverdeling niet de meerderheid van de zetels. Volgens de Kieswet (Artikel P 9 Toewijzing zetels bij volstrekte meerderheid) krijgt deze lijst één extra zetel. Deze zetel gaat ten koste van lijst 7.",
    );

    expect(screen.queryByTestId("largest-remainders-table")).not.toBeInTheDocument();
    expect(screen.queryByTestId("unique-highest-averages-table")).not.toBeInTheDocument();
  });

  test("Residual seats assignment largest remainders and unique highest averages tables visible", async () => {
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

    renderApportionmentResidualSeatsPage(3, false);

    expect(await screen.findByRole("heading", { level: 1, name: "Verdeling van de restzetels" })).toBeVisible();

    expect(
      await screen.findByRole("heading", {
        level: 2,
        name: "De restzetels gaan naar de partijen met de grootste overschotten",
      }),
    ).toBeVisible();
    const largest_remainders_table = await screen.findByTestId("largest-remainders-table");
    expect(largest_remainders_table).toBeVisible();
    expect(largest_remainders_table).toHaveTableContent([
      ["Lijst", "Lijstnaam", "Aantal volle zetels", "Overschot", "Aantal restzetels"],
      ["1", "Political Group A", "10", "8", "", "1"],
      ["2", "Political Group B", "0", "60", "", "1"],
    ]);

    expect(await screen.findByRole("heading", { level: 2, name: "Verdeling overige restzetels" })).toBeVisible();
    const unique_highest_averages_table = await screen.findByTestId("unique-highest-averages-table");
    expect(unique_highest_averages_table).toBeVisible();
    expect(unique_highest_averages_table).toHaveTableContent([
      ["Lijst", "Lijstnaam", "Reeds toegewezen", "Gemiddelde", "Aantal restzetels"],
      ["1", "Political Group A", "11", "67", "4/12", "1"],
      ["2", "Political Group B", "1", "30", "", "0"],
      ["3", "Political Group C", "0", "58", "", "1"],
      ["4", "Political Group D", "0", "57", "", "1"],
      ["5", "Blanco (Smit, G.)", "0", "56", "", "0"],
      ["6", "Political Group F", "0", "55", "", "0"],
      ["7", "Political Group G", "0", "54", "", "0"],
      ["8", "Political Group H", "0", "52", "", "0"],
    ]);

    expect(screen.queryByTestId("highest-averages-table")).not.toBeInTheDocument();
    expect(screen.queryByTestId("footnotes-list")).not.toBeInTheDocument();
  });

  test("Residual seats assignment only largest remainders table visible", async () => {
    overrideOnce("get", "/api/elections/3", 200, getElectionMockData(lt19Seats.election, lt19Seats.committee_session));
    overrideOnce("post", "/api/elections/3/apportionment", 200, {
      seat_assignment: {
        ...lt19Seats.seat_assignment,
        steps: lt19Seats.largest_remainder_steps,
      },
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

    renderApportionmentResidualSeatsPage(3, false);

    expect(await screen.findByRole("heading", { level: 1, name: "Verdeling van de restzetels" })).toBeVisible();

    expect(
      await screen.findByRole("heading", {
        level: 2,
        name: "De restzetels gaan naar de partijen met de grootste overschotten",
      }),
    ).toBeVisible();
    const largest_remainders_table = await screen.findByTestId("largest-remainders-table");
    expect(largest_remainders_table).toBeVisible();
    expect(largest_remainders_table).toHaveTableContent([
      ["Lijst", "Lijstnaam", "Aantal volle zetels", "Overschot", "Aantal restzetels"],
      ["1", "Political Group A", "10", "8", "", "1"],
      ["2", "Political Group B", "0", "60", "", "1"],
    ]);

    expect(screen.queryByTestId("highest-averages-table")).not.toBeInTheDocument();
    expect(screen.queryByTestId("unique-highest-averages-table")).not.toBeInTheDocument();
    expect(screen.queryByTestId("footnotes-list")).not.toBeInTheDocument();
  });

  test("Residual seats assignment largest remainders table with footnotes and unique highest averages table and absolute majority change and list exhaustion information visible", async () => {
    overrideOnce(
      "get",
      "/api/elections/4",
      200,
      getElectionMockData(lt19SeatsAndP9AndP10.election, lt19SeatsAndP9AndP10.committee_session),
    );
    overrideOnce("post", "/api/elections/4/apportionment", 200, {
      seat_assignment: lt19SeatsAndP9AndP10.seat_assignment,
      candidate_nomination: lt19SeatsAndP9AndP10.candidate_nomination,
      election_summary: lt19SeatsAndP9AndP10.election_summary,
      warnings: [],
    } satisfies ElectionApportionmentResponse);
    overrideOnce("get", "/api/elections/4/apportionment/state", 200, {
      deceased_candidates: [],
      lists_drawn: [],
      candidates_drawn: [],
      type: "Finalised",
    } satisfies ApportionmentState);

    renderApportionmentResidualSeatsPage(4, false);

    expect(await screen.findByRole("heading", { level: 1, name: "Verdeling van de restzetels" })).toBeVisible();

    expect(
      await screen.findByRole("heading", {
        level: 2,
        name: "De restzetels gaan naar de partijen met de grootste overschotten",
      }),
    ).toBeVisible();
    const largest_remainders_table = await screen.findByTestId("largest-remainders-table");
    expect(largest_remainders_table).toBeVisible();
    expect(largest_remainders_table).toHaveTableContent([
      ["Lijst", "Lijstnaam", "Aantal volle zetels", "Overschot", "Aantal restzetels"],
      ["1", "Political Group A", "1 5", "189", "2/15", "2 , 3 0"],
      ["2", "Political Group B", "2", "296", "7/15", "1"],
      ["3", "Political Group C", "1", "226", "11/15", "1"],
      ["4", "Political Group D", "1", "195", "11/15", "2 1"],
      ["5", "Blanco (Jacobse, F.)", "1", "112", "11/15", "1"],
    ]);

    expect(
      await screen.findByRole("heading", {
        level: 2,
        name: "Verdeling overige restzetels",
      }),
    ).toBeVisible();
    const unique_highest_averages_table = await screen.findByTestId("unique-highest-averages-table");
    expect(unique_highest_averages_table).toBeVisible();
    expect(unique_highest_averages_table).toHaveTableContent([
      ["Lijst", "Lijstnaam", "Reeds toegewezen", "Gemiddelde", "Aantal restzetels"],
      ["2", "Political Group B", "3", "244", "1/4", "1"],
    ]);

    expect(await screen.findByTestId("footnotes-list")).toHaveTextContent(
      /^Het overschot is berekend op basis van de 7 volle zetels die de lijst heeft gehaald voordat lijstuitputting is meegenomen \(Kieswet, artikel P 8\).Lijst 1 heeft meer dan de helft van alle uitgebrachte stemmen behaald, maar krijgt op basis van de standaard zetelverdeling niet de meerderheid van de zetels. Volgens de Kieswet \(Artikel P 9 Toewijzing zetels bij volstrekte meerderheid\) krijgt deze lijst één extra zetel. Deze zetel gaat ten koste van lijst 4.Omdat lijst 1 geen kandidaat heeft voor een zetel, is deze herverdeeld naar een andere lijst. \(Kieswet, artikel P 10\)$/,
    );

    expect(screen.queryByTestId("highest-averages-table")).not.toBeInTheDocument();
  });

  test("Residual seats assignment largest remainders table with footnotes and unique highest averages and highest averages tables and list exhaustion information visible", async () => {
    overrideOnce(
      "get",
      "/api/elections/6",
      200,
      getElectionMockData(lt19SeatsAndP10.election, lt19SeatsAndP10.committee_session),
    );
    overrideOnce("post", "/api/elections/6/apportionment", 200, {
      seat_assignment: lt19SeatsAndP10.seat_assignment,
      candidate_nomination: lt19SeatsAndP10.candidate_nomination,
      election_summary: lt19SeatsAndP10.election_summary,
      warnings: [],
    } satisfies ElectionApportionmentResponse);
    overrideOnce("get", "/api/elections/6/apportionment/state", 200, {
      deceased_candidates: [],
      lists_drawn: [],
      candidates_drawn: [],
      type: "Finalised",
    } satisfies ApportionmentState);

    renderApportionmentResidualSeatsPage(6, false);

    expect(await screen.findByRole("heading", { level: 1, name: "Verdeling van de restzetels" }));

    expect(
      await screen.findByRole("heading", {
        level: 2,
        name: "De restzetels gaan naar de partijen met de grootste overschotten",
      }),
    );
    const largest_remainders_table = await screen.findByTestId("largest-remainders-table");
    expect(largest_remainders_table).toBeVisible();
    expect(largest_remainders_table).toHaveTableContent([
      ["Lijst", "Lijstnaam", "Aantal volle zetels", "Overschot", "Aantal restzetels"],
      ["3", "Blanco (Smit, G.)", "1 2", "0", "", "2 0"],
    ]);

    expect(
      await screen.findByRole("heading", {
        level: 2,
        name: "Verdeling overige restzetels",
      }),
    );
    const unique_highest_averages_table = await screen.findByTestId("unique-highest-averages-table");
    expect(unique_highest_averages_table).toBeVisible();
    expect(unique_highest_averages_table).toHaveTableContent([
      ["Lijst", "Lijstnaam", "Reeds toegewezen", "Gemiddelde", "Aantal restzetels"],
      ["1", "Political Group A", "0", "5", "", "1"],
      ["2", "Political Group B", "0", "5", "", "1"],
    ]);

    const highest_averages_table = await screen.findByTestId("highest-averages-table");
    expect(highest_averages_table).toBeVisible();
    expect(highest_averages_table).toHaveTableContent([
      ["Lijst", "Lijstnaam", "Ronde 1", "Ronde 2", "Aantal restzetels"],
      ["1", "Political Group A", "2", "1/2", "", "", "1"],
      ["2", "Political Group B", "2", "1/2", "2", "1/2", "1"],
      ["3", "Blanco (Smit, G.)", "", "", "", "", "0"],
      ["", "Restzetel toegekend aan lijst", "1", "2", ""],
    ]);

    expect(await screen.findByTestId("footnotes-list")).toHaveTextContent(
      /^Het overschot is berekend op basis van de 5 volle zetels die de lijst heeft gehaald voordat lijstuitputting is meegenomen \(Kieswet, artikel P 8\).Omdat lijst 3 geen kandidaat heeft voor een zetel, is deze herverdeeld naar een andere lijst. \(Kieswet, artikel P 10\)$/,
    );
  });

  describe("Drawing lots residual seats", () => {
    test("Render alert drawing lots for list required and table for LargestRemainderResidualSeat", async () => {
      overrideOnce(
        "get",
        "/api/elections/7",
        200,
        getElectionMockData(lt19SeatsAndP7DrawingLots.election, lt19SeatsAndP7DrawingLots.committee_session),
      );
      overrideOnce("post", "/api/elections/7/apportionment", 200, {
        seat_assignment: lt19SeatsAndP7DrawingLots.seat_assignment,
        election_summary: lt19SeatsAndP7DrawingLots.election_summary,
      });
      overrideOnce("get", "/api/elections/7/apportionment/state", 200, lt19SeatsAndP7DrawingLots.state);

      renderApportionmentResidualSeatsPage(7, false);
      expect(await screen.findByRole("heading", { level: 1, name: "Verdeling van de restzetels" }));

      const alerts = await screen.findAllByRole("alert");
      expect(alerts).toHaveLength(1);

      if (alerts[0]) {
        expect(alerts[0]).toHaveClass(alertCls.notify!);
        expect(alerts[0]).toHaveTextContent("Er is nog 1 restzetel te verdelen.");
        expect(within(alerts[0]).getByRole("link", { name: "Ga naar loting" })).toHaveAttribute(
          "href",
          "/drawing-lots",
        );
      }

      expect(
        await screen.findByRole("heading", {
          level: 2,
          name: "De restzetels gaan naar de partijen met de grootste overschotten",
        }),
      );
      const largest_remainders_table = await screen.findByTestId("largest-remainders-table");
      expect(largest_remainders_table).toBeVisible();
      expect(largest_remainders_table).toHaveTableContent([
        ["Lijst", "Lijstnaam", "Aantal volle zetels", "Overschot", "Aantal restzetels"],
        ["1", "Stemmersgroep", "6", "60", "", "1"],
        ["2", "Politieke Groep der Kandidaten", "2", "0", "", "0"],
        ["3", "Stemalliantie", "2", "0", "", "0"],
        ["4", "Stem voor de Partij", "1", "0", "", "0"],
        ["5", "Alliantie van Partijen", "1", "0", "", "0"],
        ["6", "Unie voor Stemmen", "1", "0", "", "0"],
      ]);

      expect(screen.queryByTestId("unique-highest-averages-table")).not.toBeInTheDocument();
      expect(screen.queryByTestId("highest-averages-table")).not.toBeInTheDocument();
      expect(screen.queryByTestId("footnotes-list")).not.toBeInTheDocument();
    });

    test("Render alert drawing lots for list required and table for HighestAverageResidualSeat", async () => {
      const user = userEvent.setup();
      overrideOnce(
        "get",
        "/api/elections/8",
        200,
        getElectionMockData(gte19SeatsAndP7DrawingLots.election, gte19SeatsAndP7DrawingLots.committee_session),
      );
      overrideOnce("post", "/api/elections/8/apportionment", 200, {
        seat_assignment: gte19SeatsAndP7DrawingLots.seat_assignment,
        election_summary: gte19SeatsAndP7DrawingLots.election_summary,
      });
      overrideOnce("get", "/api/elections/8/apportionment/state", 200, gte19SeatsAndP7DrawingLots.state);

      const router = renderApportionmentResidualSeatsPage(8, true) as Router;
      expect(await screen.findByRole("heading", { level: 1, name: "Verdeling van de restzetels" })).toBeVisible();

      const alerts = await screen.findAllByRole("alert");
      expect(alerts).toHaveLength(1);

      if (alerts[0]) {
        expect(alerts[0]).toHaveClass(alertCls.notify!);
        expect(alerts[0]).toHaveTextContent("Er zijn nog 3 restzetels te verdelen.");
        expect(within(alerts[0]).getByRole("link", { name: "Ga naar loting" })).toHaveAttribute(
          "href",
          "/drawing-lots",
        );
      }

      expect(
        await screen.findByRole("heading", {
          level: 2,
          name: "De restzetels gaan naar de partijen met de grootste gemiddelden",
        }),
      ).toBeVisible();
      const highest_averages_table = await screen.findByTestId("highest-averages-table");
      expect(highest_averages_table).toBeVisible();
      expect(highest_averages_table).toHaveTableContent([
        ["Lijst", "Lijstnaam", "Ronde 1", "Ronde 2", "Aantal restzetels"],
        ["1", "Partij voor de Stemmer", "50", "", "45", "5/11", "1"],
        ["2", "Algemene Partij", "46", "2/3", "46", "2/3", "0"],
        ["3", "KEUS", "46", "2/3", "46", "2/3", "0"],
        ["4", "Algemene Lijst", "46", "2/3", "46", "2/3", "0"],
        ["5", "Unie van kandidaten", "46", "2/3", "46", "2/3", "0"],
        ["6", "Lijst van stemmers", "46", "2/3", "46", "2/3", "0"],
        ["", "Restzetel toegekend aan lijst", "1", "Loting nodig", ""],
      ]);

      // Check that the "Loting nodig" link links to the drawing lots page
      const rows = within(highest_averages_table).getAllByRole("row");
      if (rows[7]) {
        const link = within(rows[7]).getByRole("link", { name: "Loting nodig" });
        await user.click(link);
      }
      expect(router.state.location.pathname).toEqual("/drawing-lots");

      expect(screen.queryByTestId("largest-remainders-table")).not.toBeInTheDocument();
      expect(screen.queryByTestId("unique-highest-averages-table")).not.toBeInTheDocument();
      expect(screen.queryByTestId("footnotes-list")).not.toBeInTheDocument();
    });

    test("Render alert drawing lots for p9 required and table for LargestRemainderResidualSeat", async () => {
      overrideOnce(
        "get",
        "/api/elections/9",
        200,
        getElectionMockData(lt19SeatsAndP9DrawingLots.election, lt19SeatsAndP9DrawingLots.committee_session),
      );
      overrideOnce("post", "/api/elections/9/apportionment", 200, {
        seat_assignment: lt19SeatsAndP9DrawingLots.seat_assignment,
        election_summary: lt19SeatsAndP9DrawingLots.election_summary,
      });
      overrideOnce("get", "/api/elections/9/apportionment/state", 200, lt19SeatsAndP9DrawingLots.state);

      renderApportionmentResidualSeatsPage(9, false);
      expect(await screen.findByRole("heading", { level: 1, name: "Verdeling van de restzetels" }));

      const alerts = await screen.findAllByRole("alert");
      expect(alerts).toHaveLength(1);

      if (alerts[0]) {
        expect(alerts[0]).toHaveClass(alertCls.notify!);
        expect(alerts[0]).toHaveTextContent("Er moet 1 restzetel worden afgestaan.");
        expect(within(alerts[0]).getByRole("link", { name: "Ga naar loting" })).toHaveAttribute(
          "href",
          "/drawing-lots",
        );
      }

      expect(
        await screen.findByRole("heading", {
          level: 2,
          name: "De restzetels gaan naar de partijen met de grootste overschotten",
        }),
      );
      const largest_remainders_table = await screen.findByTestId("largest-remainders-table");
      expect(largest_remainders_table).toBeVisible();
      expect(largest_remainders_table).toHaveTableContent([
        ["Lijst", "Lijstnaam", "Aantal volle zetels", "Overschot", "Aantal restzetels"],
        ["1", "De partijdigen", "7", "170", "9/15", "0"],
        ["2", "Kiezers nu!", "1", "170", "12/15", "1"],
        ["3", "Lijst De Partij", "1", "170", "12/15", "1"],
        ["4", "Partij voor de Opkomst", "1", "170", "12/15", "1"],
        ["5", "STEM", "1", "168", "12/15", "0"],
        ["6", "Lijst van stemmers", "1", "168", "12/15", "0"],
      ]);

      expect(screen.queryByTestId("unique-highest-averages-table")).not.toBeInTheDocument();
      expect(screen.queryByTestId("highest-averages-table")).not.toBeInTheDocument();
      expect(screen.queryByTestId("footnotes-list")).not.toBeInTheDocument();
    });

    test("Render alert drawing lots for p9 required and table for HighestAverageResidualSeat", async () => {
      overrideOnce(
        "get",
        "/api/elections/10",
        200,
        getElectionMockData(gte19SeatsAndP9DrawingLots.election, gte19SeatsAndP9DrawingLots.committee_session),
      );
      overrideOnce("post", "/api/elections/10/apportionment", 200, {
        seat_assignment: gte19SeatsAndP9DrawingLots.seat_assignment,
        election_summary: gte19SeatsAndP9DrawingLots.election_summary,
      });
      overrideOnce("get", "/api/elections/10/apportionment/state", 200, gte19SeatsAndP9DrawingLots.state);

      renderApportionmentResidualSeatsPage(10, false);
      expect(await screen.findByRole("heading", { level: 1, name: "Verdeling van de restzetels" })).toBeVisible();

      const alerts = await screen.findAllByRole("alert");
      expect(alerts).toHaveLength(1);

      if (alerts[0]) {
        expect(alerts[0]).toHaveClass(alertCls.notify!);
        expect(alerts[0]).toHaveTextContent("Er moet 1 restzetel worden afgestaan.");
        expect(within(alerts[0]).getByRole("link", { name: "Ga naar loting" })).toHaveAttribute(
          "href",
          "/drawing-lots",
        );
      }

      expect(
        await screen.findByRole("heading", {
          level: 2,
          name: "De restzetels gaan naar de partijen met de grootste gemiddelden",
        }),
      ).toBeVisible();
      const highest_averages_table = await screen.findByTestId("highest-averages-table");
      expect(highest_averages_table).toBeVisible();
      expect(highest_averages_table).toHaveTableContent([
        ["Lijst", "Lijstnaam", "Ronde 1", "Ronde 2", "Ronde 3", "Ronde 4", "Ronde 5", "Ronde 6", "Aantal restzetels"],
        ["1", "De Kandidaat", "577", "", "577", "", "577", "", "577", "", "577", "", "577", "", "0"],
        [
          "2",
          "Kandidaten eerst!",
          "624",
          "1/2",
          "416",
          "1/3",
          "416",
          "1/3",
          "416",
          "1/3",
          "416",
          "1/3",
          "416",
          "1/3",
          "1",
        ],
        [
          "3",
          "Unie voor Stemmen",
          "624",
          "1/2",
          "624",
          "1/2",
          "416",
          "1/3",
          "416",
          "1/3",
          "416",
          "1/3",
          "416",
          "1/3",
          "1",
        ],
        [
          "4",
          "Stem voor kandidaten",
          "624",
          "1/2",
          "624",
          "1/2",
          "624",
          "1/2",
          "416",
          "1/3",
          "416",
          "1/3",
          "416",
          "1/3",
          "1",
        ],
        ["5", "De Stemunie", "624", "1/2", "624", "1/2", "624", "1/2", "624", "1/2", "416", "1/3", "416", "1/3", "1"],
        ["6", "Altijd van de Partij", "624", "", "624", "", "624", "", "624", "", "624", "", "416", "", "1"],
        ["7", "Partij van de Keuze", "624", "", "624", "", "624", "", "624", "", "624", "", "624", "", "1"],
        ["8", "Stemmersgroep", "8", "", "8", "", "8", "", "8", "", "8", "", "8", "", "0"],
        ["", "Restzetel toegekend aan lijst", "2", "3", "4", "5", "6", "7", ""],
      ]);

      expect(screen.queryByTestId("largest-remainders-table")).not.toBeInTheDocument();
      expect(screen.queryByTestId("unique-highest-averages-table")).not.toBeInTheDocument();
      expect(screen.queryByTestId("footnotes-list")).not.toBeInTheDocument();
    });
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

      renderApportionmentResidualSeatsPage(3, false);

      // Wait for the page to be loaded
      expect(await screen.findByRole("heading", { level: 1, name: "Verdeling van de restzetels" })).toBeVisible();

      expect(await screen.findByText("Zetelverdeling is nog niet beschikbaar")).toBeVisible();
      expect(
        await screen.findByText("De zetelverdeling kan pas gemaakt worden als de zitting is afgerond"),
      ).toBeVisible();

      expect(screen.queryByTestId("highest-averages-table")).not.toBeInTheDocument();
      expect(screen.queryByTestId("largest-remainders-table")).not.toBeInTheDocument();
      expect(screen.queryByTestId("unique-highest-averages-table")).not.toBeInTheDocument();
      expect(screen.queryByTestId("footnotes-list")).not.toBeInTheDocument();
    });

    test("Not possible because committee session is not completed yet", async () => {
      overrideOnce("post", "/api/elections/3/apportionment", 412, {
        error: "Committee session not completed",
        fatal: false,
        reference: "ApportionmentCommitteeSessionNotCompleted",
      } satisfies ErrorResponse);

      renderApportionmentResidualSeatsPage(3, false);

      // Wait for the page to be loaded
      expect(await screen.findByRole("heading", { level: 1, name: "Verdeling van de restzetels" })).toBeVisible();

      expect(await screen.findByText("Zetelverdeling is nog niet beschikbaar")).toBeVisible();
      expect(
        await screen.findByText("De zetelverdeling kan pas gemaakt worden als de zitting is afgerond"),
      ).toBeVisible();

      expect(screen.queryByTestId("highest-averages-table")).not.toBeInTheDocument();
      expect(screen.queryByTestId("largest-remainders-table")).not.toBeInTheDocument();
      expect(screen.queryByTestId("unique-highest-averages-table")).not.toBeInTheDocument();
      expect(screen.queryByTestId("footnotes-list")).not.toBeInTheDocument();
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

      await router.navigate("/elections/3/apportionment/details-residual-seats");

      rtlRender(<Providers router={router} />);

      await expectErrorPage();
    });
  });
});

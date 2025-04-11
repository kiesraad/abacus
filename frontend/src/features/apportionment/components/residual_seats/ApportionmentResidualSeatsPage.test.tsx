import { render as rtlRender } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import { ElectionProvider } from "@/api/election/ElectionProvider";
import { ElectionApportionmentResponse, ErrorResponse } from "@/api/gen/openapi";
// eslint-disable-next-line import/no-restricted-paths -- #1283
import { routes } from "@/app/routes";
import { getElectionMockData } from "@/testing/api-mocks/ElectionMockData";
import { Providers } from "@/testing/Providers";
import { overrideOnce } from "@/testing/server";
import { expectErrorPage, render, screen, setupTestRouter } from "@/testing/test-utils";

import * as gte19Seats from "../../testing/19-or-more-seats";
import * as absoluteMajorityChangeAndListExhaustion from "../../testing/absolute-majority-change-and-list-exhaustion";
import * as lt19Seats from "../../testing/less-than-19-seats";
import { ApportionmentProvider } from "../ApportionmentProvider";
import { ApportionmentResidualSeatsPage } from "./ApportionmentResidualSeatsPage";

const renderApportionmentResidualSeatsPage = () =>
  render(
    <ElectionProvider electionId={1}>
      <ApportionmentProvider electionId={1}>
        <ApportionmentResidualSeatsPage />
      </ApportionmentProvider>
    </ElectionProvider>,
  );

describe("ApportionmentResidualSeatsPage", () => {
  test("Residual seats assignment table for 19 or more seats visible", async () => {
    overrideOnce("get", "/api/elections/1", 200, getElectionMockData(gte19Seats.election));
    overrideOnce("post", "/api/elections/1/apportionment", 200, {
      seat_assignment: gte19Seats.seat_assignment,
      candidate_nomination: gte19Seats.candidate_nomination,
      election_summary: gte19Seats.election_summary,
    } satisfies ElectionApportionmentResponse);

    renderApportionmentResidualSeatsPage();

    expect(await screen.findByRole("heading", { level: 1, name: "Verdeling van de restzetels" }));

    expect(
      await screen.findByRole("heading", {
        level: 2,
        name: "De restzetels gaan naar de partijen met de grootste gemiddelden",
      }),
    );
    const highest_averages_for_19_or_more_seats_table = await screen.findByTestId(
      "highest-averages-for-19-or-more-seats-table",
    );
    expect(highest_averages_for_19_or_more_seats_table).toBeVisible();
    expect(highest_averages_for_19_or_more_seats_table).toHaveTableContent([
      ["Lijst", "Lijstnaam", "Restzetel 1", "Restzetel 2", "Restzetel 3", "Restzetel 4", "Aantal restzetels"],
      ["1", "Political Group A", "50", "", "50", "", "50", "", "46", "2/13", "1"],
      ["2", "Political Group B", "50", "2/6", "50", "2/6", "43", "1/7", "43", "1/7", "1"],
      ["3", "Political Group C", "49", "", "49", "", "49", "", "49", "", "0"],
      ["4", "Political Group D", "49", "1/2", "49", "1/2", "49", "1/2", "49", "1/2", "1"],
      ["5", "Political Group E", "50", "1/2", "33", "2/3", "33", "2/3", "33", "2/3", "1"],
      ["", "Restzetel toegekend aan lijst", "5", "2", "1", "4", ""],
    ]);

    expect(screen.queryByTestId("largest-remainders-table")).not.toBeInTheDocument();
    expect(screen.queryByTestId("highest-averages-for-less-than-19-seats-table")).not.toBeInTheDocument();
    expect(screen.queryByTestId("absolute-majority-change-information")).not.toBeInTheDocument();
  });

  test("Residual seats assignment tables for less than 19 seats with both methods visible", async () => {
    overrideOnce("get", "/api/elections/1", 200, getElectionMockData(lt19Seats.election));
    overrideOnce("post", "/api/elections/1/apportionment", 200, {
      seat_assignment: lt19Seats.seat_assignment,
      candidate_nomination: lt19Seats.candidate_nomination,
      election_summary: lt19Seats.election_summary,
    } satisfies ElectionApportionmentResponse);

    renderApportionmentResidualSeatsPage();

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
      ["1", "Political Group A", "10", "8", "", "1"],
      ["2", "Political Group B", "0", "60", "", "1"],
    ]);

    expect(await screen.findByRole("heading", { level: 2, name: "Verdeling overige restzetels" }));
    const highest_averages_for_less_than_19_seats_table = await screen.findByTestId(
      "highest-averages-for-less-than-19-seats-table",
    );
    expect(highest_averages_for_less_than_19_seats_table).toBeVisible();
    expect(highest_averages_for_less_than_19_seats_table).toHaveTableContent([
      ["Lijst", "Lijstnaam", "Aantal volle zetels", "Gemiddelde", "Aantal restzetels"],
      ["1", "Political Group A", "10", "67", "4/12", "1"],
      ["2", "Political Group B", "0", "30", "", "0"],
      ["3", "Political Group C", "0", "58", "", "1"],
      ["4", "Political Group D", "0", "57", "", "1"],
      ["5", "Political Group E", "0", "56", "", "0"],
      ["6", "Political Group F", "0", "55", "", "0"],
      ["7", "Political Group G", "0", "54", "", "0"],
      ["8", "Political Group H", "0", "52", "", "0"],
    ]);

    expect(screen.queryByTestId("highest_averages_for_19_or_more_seats_table")).not.toBeInTheDocument();
    expect(screen.queryByTestId("absolute_majority_change_information")).not.toBeInTheDocument();
  });

  test("Residual seats assignment tables for less than 19 seats with only largest remainders method visible", async () => {
    overrideOnce("get", "/api/elections/1", 200, getElectionMockData(lt19Seats.election));
    overrideOnce("post", "/api/elections/1/apportionment", 200, {
      seat_assignment: {
        ...lt19Seats.seat_assignment,
        steps: lt19Seats.largest_remainder_steps,
      },
      candidate_nomination: lt19Seats.candidate_nomination,
      election_summary: lt19Seats.election_summary,
    } satisfies ElectionApportionmentResponse);

    renderApportionmentResidualSeatsPage();

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
      ["1", "Political Group A", "10", "8", "", "1"],
      ["2", "Political Group B", "0", "60", "", "1"],
    ]);

    expect(screen.queryByTestId("highest-averages-for-19-or-more-seats-table")).not.toBeInTheDocument();
    expect(screen.queryByTestId("highest-averages-for-less-than-19-seats-table")).not.toBeInTheDocument();
    expect(screen.queryByTestId("absolute-majority-change-information")).not.toBeInTheDocument();
  });

  test("Residual seats assignment table for less than 19 seats and absolute majority change and list exhaustion information visible", async () => {
    overrideOnce("get", "/api/elections/1", 200, getElectionMockData(absoluteMajorityChangeAndListExhaustion.election));
    overrideOnce("post", "/api/elections/1/apportionment", 200, {
      seat_assignment: absoluteMajorityChangeAndListExhaustion.seat_assignment,
      candidate_nomination: absoluteMajorityChangeAndListExhaustion.candidate_nomination,
      election_summary: absoluteMajorityChangeAndListExhaustion.election_summary,
    } satisfies ElectionApportionmentResponse);

    renderApportionmentResidualSeatsPage();

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
      ["1", "Political Group A", "5", "189", "2/15", "0"],
      ["2", "Political Group B", "2", "296", "7/15", "1"],
      ["3", "Political Group C", "1", "226", "11/15", "1"],
      ["4", "Political Group D", "1", "195", "11/15", "2"],
      ["5", "Political Group E", "1", "112", "11/15", "1"],
    ]);

    expect(
      await screen.findByRole("heading", {
        level: 2,
        name: "Verdeling overige restzetels",
      }),
    );
    const highest_averages_table = await screen.findByTestId("highest-averages-for-less-than-19-seats-table");
    expect(highest_averages_table).toBeVisible();
    expect(highest_averages_table).toHaveTableContent([
      ["Lijst", "Lijstnaam", "Aantal volle zetels", "Gemiddelde", "Aantal restzetels"],
      ["1", "Political Group A", "5", "321", "3/8", "0"],
      ["2", "Political Group B", "2", "244", "1/4", "1"],
      ["3", "Political Group C", "1", "189", "", "0"],
      ["4", "Political Group D", "1", "178", "2/3", "0"],
      ["5", "Political Group E", "1", "151", "", "0"],
    ]);

    expect(await screen.findByTestId("absolute-majority-reassignment-information")).toHaveTextContent(
      "Lijst 1 heeft meer dan de helft van alle uitgebrachte stemmen behaalt, maar krijgt op basis van de standaard zetelverdeling niet de meerderheid van de zetels. Volgens de Kieswet (Artikel P 9 Toewijzing zetels bij volstrekte meerderheid) krijgt deze lijst één extra zetel. Deze zetel gaat ten koste van lijst 4 omdat die de laatste restzetel toegewezen heeft gekregen.",
    );
    expect(await screen.findByTestId("list-exhaustion-step-1-information")).toHaveTextContent(
      "Omdat lijst 1 geen kandidaat heeft voor een zetel, gaat deze zetel naar lijst 4. (Kieswet, artikel P 10 of P 13 eerste lid)",
    );
    expect(await screen.findByTestId("list-exhaustion-step-2-information")).toHaveTextContent(
      "Omdat lijst 1 geen kandidaat heeft voor een zetel, gaat deze zetel naar lijst 5.",
    );
    expect(await screen.findByTestId("list-exhaustion-step-3-information")).toHaveTextContent(
      "Omdat lijst 1 geen kandidaat heeft voor een zetel, gaat deze zetel naar lijst 2.",
    );

    expect(screen.queryByTestId("highest-averages-for-19-or-more-seats-table")).not.toBeInTheDocument();
  });

  describe("Apportionment not yet available", () => {
    test("Not available until data entry is finalised", async () => {
      overrideOnce("get", "/api/elections/1", 200, getElectionMockData(lt19Seats.election));
      overrideOnce("post", "/api/elections/1/apportionment", 412, {
        error: "Election data entry first needs to be finalised",
        fatal: false,
        reference: "ApportionmentNotAvailableUntilDataEntryFinalised",
      } satisfies ErrorResponse);

      renderApportionmentResidualSeatsPage();

      // Wait for the page to be loaded
      expect(await screen.findByRole("heading", { level: 1, name: "Verdeling van de restzetels" }));

      expect(await screen.findByText("Zetelverdeling is nog niet beschikbaar")).toBeVisible();
      expect(
        await screen.findByText("De zetelverdeling kan pas gemaakt worden als alle stembureaus zijn ingevoerd"),
      ).toBeVisible();

      expect(screen.queryByTestId("highest-averages-for-19-or-more-seats-table")).not.toBeInTheDocument();
      expect(screen.queryByTestId("largest-remainders-table")).not.toBeInTheDocument();
      expect(screen.queryByTestId("highest-averages-for-less-than-19-seats-table")).not.toBeInTheDocument();
      expect(screen.queryByTestId("absolute-majority-change-information")).not.toBeInTheDocument();
    });

    test("Not possible because drawing of lots is not implemented yet", async () => {
      overrideOnce("get", "/api/elections/1", 200, getElectionMockData(lt19Seats.election));
      overrideOnce("post", "/api/elections/1/apportionment", 422, {
        error: "Drawing of lots is required",
        fatal: false,
        reference: "DrawingOfLotsRequired",
      } satisfies ErrorResponse);

      renderApportionmentResidualSeatsPage();

      // Wait for the page to be loaded
      expect(await screen.findByRole("heading", { level: 1, name: "Verdeling van de restzetels" }));

      expect(await screen.findByText("Zetelverdeling is niet mogelijk")).toBeVisible();
      expect(
        await screen.findByText("Loting is noodzakelijk, maar nog niet beschikbaar in deze versie van Abacus"),
      ).toBeVisible();

      expect(screen.queryByTestId("highest-averages-for-19-or-more-seats-table")).not.toBeInTheDocument();
      expect(screen.queryByTestId("largest-remainders-table")).not.toBeInTheDocument();
      expect(screen.queryByTestId("highest-averages-for-less-than-19-seats-table")).not.toBeInTheDocument();
      expect(screen.queryByTestId("absolute-majority-change-information")).not.toBeInTheDocument();
    });

    test("Not possible because all lists are exhausted", async () => {
      overrideOnce("get", "/api/elections/1", 200, getElectionMockData(lt19Seats.election));
      overrideOnce("post", "/api/elections/1/apportionment", 422, {
        error: "All lists are exhausted, not enough candidates to fill all seats",
        fatal: false,
        reference: "AllListsExhausted",
      } satisfies ErrorResponse);

      renderApportionmentResidualSeatsPage();

      // Wait for the page to be loaded
      expect(await screen.findByRole("heading", { level: 1, name: "Verdeling van de restzetels" }));

      expect(await screen.findByText("Zetelverdeling is niet mogelijk")).toBeVisible();
      expect(
        await screen.findByText(
          "Er zijn te weinig kandidaten om alle aan lijsten toegewezen zetels te vullen. Abacus kan daarom geen zetelverdeling berekenen. Neem contact op met de Kiesraad.",
        ),
      ).toBeVisible();

      expect(screen.queryByTestId("highest-averages-for-19-or-more-seats-table")).not.toBeInTheDocument();
      expect(screen.queryByTestId("largest-remainders-table")).not.toBeInTheDocument();
      expect(screen.queryByTestId("highest-averages-for-less-than-19-seats-table")).not.toBeInTheDocument();
      expect(screen.queryByTestId("absolute-majority-change-information")).not.toBeInTheDocument();
    });

    test("Not possible because no votes on candidates cast", async () => {
      overrideOnce("get", "/api/elections/1", 200, getElectionMockData(lt19Seats.election));
      overrideOnce("post", "/api/elections/1/apportionment", 422, {
        error: "No votes on candidates cast",
        fatal: false,
        reference: "ZeroVotesCast",
      } satisfies ErrorResponse);

      renderApportionmentResidualSeatsPage();

      // Wait for the page to be loaded
      expect(await screen.findByRole("heading", { level: 1, name: "Verdeling van de restzetels" }));

      expect(await screen.findByText("Zetelverdeling is niet mogelijk")).toBeVisible();
      expect(
        await screen.findByText(
          "Er zijn geen stemmen op kandidaten uitgebracht. Abacus kan daarom geen zetelverdeling berekenen. Neem contact op met de Kiesraad.",
        ),
      ).toBeVisible();

      expect(screen.queryByTestId("highest-averages-for-19-or-more-seats-table")).not.toBeInTheDocument();
      expect(screen.queryByTestId("largest-remainders-table")).not.toBeInTheDocument();
      expect(screen.queryByTestId("highest-averages-for-less-than-19-seats-table")).not.toBeInTheDocument();
      expect(screen.queryByTestId("absolute-majority-change-information")).not.toBeInTheDocument();
    });

    test("Internal Server Error renders error page", async () => {
      // Since we test what happens after an error, we want vitest to ignore them
      vi.spyOn(console, "error").mockImplementation(() => {
        /* do nothing */
      });
      const router = setupTestRouter(routes);

      overrideOnce("get", "/api/elections/1", 200, getElectionMockData(lt19Seats.election));
      overrideOnce("post", "/api/elections/1/apportionment", 500, {
        error: "Internal Server Error",
        fatal: true,
        reference: "InternalServerError",
      });

      await router.navigate("/elections/1/apportionment/details-residual-seats");

      rtlRender(<Providers router={router} />);

      await expectErrorPage();
    });
  });
});

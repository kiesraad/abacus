import { render as rtlRender } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import {
  apportionment as apportionment_19_or_more_seats,
  election as election_19_or_more_seats,
  election_summary as election_summary_19_or_more_seats,
} from "app/component/apportionment/test-data/19-or-more-seats";
import {
  apportionment as apportionment_absolute_majority_change,
  election as election_absolute_majority_change,
  election_summary as election_summary_absolute_majority_change,
} from "app/component/apportionment/test-data/absolute-majority-change";
import {
  apportionment as apportionment_less_than_19_seats,
  election as election_less_than_19_seats,
  election_summary as election_summary_less_than_19_seats,
  largest_remainder_steps,
} from "app/component/apportionment/test-data/less-than-19-seats";
import { routes } from "app/routes";

import { ApportionmentProvider, ElectionApportionmentResponse, ElectionProvider, ErrorResponse } from "@kiesraad/api";
import { getElectionMockData } from "@kiesraad/api-mocks";
import { expectErrorPage, overrideOnce, Providers, render, screen, setupTestRouter } from "@kiesraad/test";

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
  test("Residual seats allocation table for 19 or more seats visible", async () => {
    overrideOnce("get", "/api/elections/1", 200, getElectionMockData(election_19_or_more_seats));
    overrideOnce("post", "/api/elections/1/apportionment", 200, {
      apportionment: apportionment_19_or_more_seats,
      election_summary: election_summary_19_or_more_seats,
    } satisfies ElectionApportionmentResponse);

    renderApportionmentResidualSeatsPage();

    expect(await screen.findByRole("heading", { level: 1, name: "Verdeling van de restzetels" }));

    expect(
      await screen.findByRole("heading", {
        level: 2,
        name: "De restzetels gaan naar de partijen met de grootste gemiddelden",
      }),
    );
    const largest_averages_for_19_or_more_seats_table = await screen.findByTestId(
      "largest_averages_for_19_or_more_seats_table",
    );
    expect(largest_averages_for_19_or_more_seats_table).toBeVisible();
    expect(largest_averages_for_19_or_more_seats_table).toHaveTableContent([
      ["Lijst", "Lijstnaam", "Restzetel 1", "Restzetel 2", "Restzetel 3", "Restzetel 4", "Aantal restzetels"],
      ["1", "Political Group A", "50", "", "50", "", "50", "", "46", "2/13", "1"],
      ["2", "Political Group B", "50", "2/6", "50", "2/6", "43", "1/7", "43", "1/7", "1"],
      ["3", "Political Group C", "49", "", "49", "", "49", "", "49", "", "0"],
      ["4", "Political Group D", "49", "1/2", "49", "1/2", "49", "1/2", "49", "1/2", "1"],
      ["5", "Political Group E", "50", "1/2", "33", "2/3", "33", "2/3", "33", "2/3", "1"],
      ["", "Restzetel toegekend aan lijst", "5", "2", "1", "4", ""],
    ]);

    expect(screen.queryByTestId("largest_remainders_table")).not.toBeInTheDocument();
    expect(screen.queryByTestId("largest_averages_for_less_than_19_seats_table")).not.toBeInTheDocument();
    expect(screen.queryByTestId("absolute_majority_change_information")).not.toBeInTheDocument();
  });

  test("Residual seats allocation tables for less than 19 seats with both systems visible", async () => {
    overrideOnce("get", "/api/elections/1", 200, getElectionMockData(election_less_than_19_seats));
    overrideOnce("post", "/api/elections/1/apportionment", 200, {
      apportionment: apportionment_less_than_19_seats,
      election_summary: election_summary_less_than_19_seats,
    } satisfies ElectionApportionmentResponse);

    renderApportionmentResidualSeatsPage();

    expect(await screen.findByRole("heading", { level: 1, name: "Verdeling van de restzetels" }));

    expect(
      await screen.findByRole("heading", {
        level: 2,
        name: "De restzetels gaan naar de partijen met de grootste overschotten",
      }),
    );
    const largest_remainders_table = await screen.findByTestId("largest_remainders_table");
    expect(largest_remainders_table).toBeVisible();
    expect(largest_remainders_table).toHaveTableContent([
      ["Lijst", "Lijstnaam", "Aantal volle zetels", "Overschot", "Aantal restzetels"],
      ["1", "Political Group A", "10", "8", "", "1"],
      ["2", "Political Group B", "0", "60", "", "1"],
    ]);

    expect(await screen.findByRole("heading", { level: 2, name: "Verdeling overige restzetels" }));
    const largest_averages_for_less_than_19_seats_table = await screen.findByTestId(
      "largest_averages_for_less_than_19_seats_table",
    );
    expect(largest_averages_for_less_than_19_seats_table).toBeVisible();
    expect(largest_averages_for_less_than_19_seats_table).toHaveTableContent([
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

    expect(screen.queryByTestId("largest_averages_for_19_or_more_seats_table")).not.toBeInTheDocument();
    expect(screen.queryByTestId("absolute_majority_change_information")).not.toBeInTheDocument();
  });

  test("Residual seats allocation tables for less than 19 seats with only remainder system visible", async () => {
    overrideOnce("get", "/api/elections/1", 200, getElectionMockData(election_less_than_19_seats));
    overrideOnce("post", "/api/elections/1/apportionment", 200, {
      apportionment: {
        ...apportionment_less_than_19_seats,
        steps: largest_remainder_steps,
      },
      election_summary: election_summary_less_than_19_seats,
    } satisfies ElectionApportionmentResponse);

    renderApportionmentResidualSeatsPage();

    expect(await screen.findByRole("heading", { level: 1, name: "Verdeling van de restzetels" }));

    expect(
      await screen.findByRole("heading", {
        level: 2,
        name: "De restzetels gaan naar de partijen met de grootste overschotten",
      }),
    );
    const largest_remainders_table = await screen.findByTestId("largest_remainders_table");
    expect(largest_remainders_table).toBeVisible();
    expect(largest_remainders_table).toHaveTableContent([
      ["Lijst", "Lijstnaam", "Aantal volle zetels", "Overschot", "Aantal restzetels"],
      ["1", "Political Group A", "10", "8", "", "1"],
      ["2", "Political Group B", "0", "60", "", "1"],
    ]);

    expect(screen.queryByTestId("largest_averages_for_19_or_more_seats_table")).not.toBeInTheDocument();
    expect(screen.queryByTestId("largest_averages_for_less_than_19_seats_table")).not.toBeInTheDocument();
    expect(screen.queryByTestId("absolute_majority_change_information")).not.toBeInTheDocument();
  });

  test("Residual seats allocation table for less than 19 seats and absolute majority change information visible", async () => {
    overrideOnce("get", "/api/elections/1", 200, getElectionMockData(election_absolute_majority_change));
    overrideOnce("post", "/api/elections/1/apportionment", 200, {
      apportionment: apportionment_absolute_majority_change,
      election_summary: election_summary_absolute_majority_change,
    } satisfies ElectionApportionmentResponse);

    renderApportionmentResidualSeatsPage();

    expect(await screen.findByRole("heading", { level: 1, name: "Verdeling van de restzetels" }));

    expect(
      await screen.findByRole("heading", {
        level: 2,
        name: "De restzetels gaan naar de partijen met de grootste overschotten",
      }),
    );
    const largest_surpluses_table = await screen.findByTestId("largest_surpluses_table");
    expect(largest_surpluses_table).toBeVisible();
    expect(largest_surpluses_table).toHaveTableContent([
      ["Lijst", "Lijstnaam", "Aantal volle zetels", "Overschot", "Aantal restzetels"],
      ["1", "Political Group A", "7", "189", "2/15", "0"],
      ["2", "Political Group B", "2", "296", "7/15", "1"],
      ["3", "Political Group C", "1", "226", "11/15", "1"],
      ["4", "Political Group D", "1", "195", "11/15", "1"],
      ["5", "Political Group E", "1", "112", "11/15", "0"],
    ]);

    expect(await screen.findByTestId("absolute_majority_change_information")).toHaveTextContent(
      "Overeenkomstig artikel P 9 van de Kieswet (volstrekte meerderheid) wordt aan lijst 1 alsnog één zetel toegewezen en vervalt daartegenover één zetel, die eerder was toegewezen aan lijst 4.",
    );

    expect(screen.queryByTestId("largest_averages_for_19_or_more_seats_table")).not.toBeInTheDocument();
    expect(screen.queryByTestId("largest_averages_for_less_than_19_seats_table")).not.toBeInTheDocument();
  });

  describe("Apportionment not yet available", () => {
    test("Not available until data entry is finalised", async () => {
      overrideOnce("get", "/api/elections/1", 200, getElectionMockData(election_less_than_19_seats));
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

      expect(screen.queryByTestId("largest_averages_for_19_or_more_seats_table")).not.toBeInTheDocument();
      expect(screen.queryByTestId("largest_remainders_table")).not.toBeInTheDocument();
      expect(screen.queryByTestId("largest_averages_for_less_than_19_seats_table")).not.toBeInTheDocument();
      expect(screen.queryByTestId("absolute_majority_change_information")).not.toBeInTheDocument();
    });

    test("Not available because drawing of lots is not implemented yet", async () => {
      overrideOnce("get", "/api/elections/1", 200, getElectionMockData(election_less_than_19_seats));
      overrideOnce("post", "/api/elections/1/apportionment", 422, {
        error: "Drawing of lots is required",
        fatal: false,
        reference: "DrawingOfLotsRequired",
      } satisfies ErrorResponse);

      renderApportionmentResidualSeatsPage();

      // Wait for the page to be loaded
      expect(await screen.findByRole("heading", { level: 1, name: "Verdeling van de restzetels" }));

      expect(await screen.findByText("Zetelverdeling is nog niet beschikbaar")).toBeVisible();
      expect(
        await screen.findByText("Loting is noodzakelijk, maar nog niet beschikbaar in deze versie van Abacus"),
      ).toBeVisible();

      expect(screen.queryByTestId("largest_averages_for_19_or_more_seats_table")).not.toBeInTheDocument();
      expect(screen.queryByTestId("largest_remainders_table")).not.toBeInTheDocument();
      expect(screen.queryByTestId("largest_averages_for_less_than_19_seats_table")).not.toBeInTheDocument();
      expect(screen.queryByTestId("absolute_majority_change_information")).not.toBeInTheDocument();
    });

    test("Internal Server Error renders error page", async () => {
      // Since we test what happens after an error, we want vitest to ignore them
      vi.spyOn(console, "error").mockImplementation(() => {
        /* do nothing */
      });
      const router = setupTestRouter(routes);

      overrideOnce("get", "/api/elections/1", 200, getElectionMockData(election_less_than_19_seats));
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

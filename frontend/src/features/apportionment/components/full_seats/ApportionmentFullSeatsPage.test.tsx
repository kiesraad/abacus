import { render as rtlRender } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import { ErrorBoundary } from "@/components/error/ErrorBoundary";
import { ElectionProvider } from "@/hooks/election/ElectionProvider";
import { getElectionMockData } from "@/testing/api-mocks/ElectionMockData";
import { Providers } from "@/testing/Providers";
import { overrideOnce } from "@/testing/server";
import { expectErrorPage, render, screen, setupTestRouter } from "@/testing/test-utils";
import { ElectionApportionmentResponse, ErrorResponse } from "@/types/generated/openapi";

import * as lt19Seats from "../../testing/lt-19-seats";
import * as lt19SeatsAndP9AndP10 from "../../testing/lt-19-seats-and-p9-and-p10";
import { apportionmentRoutes } from "../../routes";
import { ApportionmentProvider } from "../ApportionmentProvider";
import { ApportionmentFullSeatsPage } from "./ApportionmentFullSeatsPage";

const renderApportionmentFullSeatsPage = () =>
  render(
    <ElectionProvider electionId={1}>
      <ApportionmentProvider electionId={1}>
        <ApportionmentFullSeatsPage />
      </ApportionmentProvider>
    </ElectionProvider>,
  );

describe("ApportionmentFullSeatsPage", () => {
  test("Full seats assignment and residual seats calculation tables visible", async () => {
    overrideOnce("get", "/api/elections/1", 200, getElectionMockData(lt19Seats.election));
    overrideOnce("post", "/api/elections/1/apportionment", 200, {
      seat_assignment: lt19Seats.seat_assignment,
      candidate_nomination: lt19Seats.candidate_nomination,
      election_summary: lt19Seats.election_summary,
    } satisfies ElectionApportionmentResponse);

    renderApportionmentFullSeatsPage();

    expect(await screen.findByRole("heading", { level: 1, name: "Verdeling van de volle zetels" })).toBeVisible();

    expect(
      await screen.findByRole("heading", { level: 2, name: "Hoe vaak haalde elke partij de kiesdeler?" }),
    ).toBeVisible();
    const full_seats_table = await screen.findByTestId("full-seats-table");
    expect(full_seats_table).toBeVisible();
    expect(full_seats_table).toHaveTableContent([
      ["Lijst", "Lijstnaam", "Aantal stemmen", ":", "Kiesdeler", "=", "Aantal volle zetels"],
      ["1", "Political Group A", "808", ":", "80", "", "=", "10"],
      ["2", "Political Group B", "60", ":", "80", "", "=", "0"],
      ["3", "Political Group C", "58", ":", "80", "", "=", "0"],
      ["4", "Political Group D", "57", ":", "80", "", "=", "0"],
      ["5", "Political Group E", "56", ":", "80", "", "=", "0"],
      ["6", "Political Group F", "55", ":", "80", "", "=", "0"],
      ["7", "Political Group G", "54", ":", "80", "", "=", "0"],
      ["8", "Political Group H", "52", ":", "80", "", "=", "0"],
    ]);

    expect(
      await screen.findByRole("heading", { level: 2, name: "Hoeveel restzetels zijn er te verdelen?" }),
    ).toBeVisible();
    const residual_seats_calculation_table = await screen.findByTestId("residual-seats-calculation-table");
    expect(residual_seats_calculation_table).toBeVisible();
    expect(residual_seats_calculation_table).toHaveTableContent([
      ["Totaal aantal zetels", "15", ""],
      ["Totaal aantal toegewezen volle zetels", "10", "— (min)"],
      ["Restzetels", "5", ""],
    ]);
  });

  test("Full seats assignment with footnotes and residual seats calculation tables visible", async () => {
    overrideOnce("get", "/api/elections/1", 200, getElectionMockData(lt19SeatsAndP9AndP10.election));
    overrideOnce("post", "/api/elections/1/apportionment", 200, {
      seat_assignment: lt19SeatsAndP9AndP10.seat_assignment,
      candidate_nomination: lt19SeatsAndP9AndP10.candidate_nomination,
      election_summary: lt19SeatsAndP9AndP10.election_summary,
    } satisfies ElectionApportionmentResponse);

    renderApportionmentFullSeatsPage();

    expect(await screen.findByRole("heading", { level: 1, name: "Verdeling van de volle zetels" }));

    expect(await screen.findByRole("heading", { level: 2, name: "Hoe vaak haalde elke partij de kiesdeler?" }));
    const full_seats_table = await screen.findByTestId("full-seats-table");
    expect(full_seats_table).toBeVisible();
    expect(full_seats_table).toHaveTableContent([
      ["Lijst", "Lijstnaam", "Aantal stemmen", ":", "Kiesdeler", "=", "Aantal volle zetels"],
      ["1", "Political Group A", "2571", ":", "340", "4/15", "=", "7 1 , 2 5"],
      ["2", "Political Group B", "977", ":", "340", "4/15", "=", "2"],
      ["3", "Political Group C", "567", ":", "340", "4/15", "=", "1"],
      ["4", "Political Group D", "536", ":", "340", "4/15", "=", "1"],
      ["5", "Political Group E", "453", ":", "340", "4/15", "=", "1"],
    ]);

    expect(await screen.findByTestId("1-list-exhaustion-information")).toHaveTextContent(
      "1 Omdat lijst 1 onvoldoende kandidaten heeft, is één volle zetel herverdeeld als restzetel. (Kieswet, artikel P 10 of P 13 eerste lid)",
    );
    expect(await screen.findByTestId("2-list-exhaustion-information")).toHaveTextContent(
      "2 Omdat lijst 1 onvoldoende kandidaten heeft, is één volle zetel herverdeeld als restzetel.",
    );

    expect(await screen.findByRole("heading", { level: 2, name: "Hoeveel restzetels zijn er te verdelen?" }));
    const residual_seats_calculation_table = await screen.findByTestId("residual-seats-calculation-table");
    expect(residual_seats_calculation_table).toBeVisible();
    expect(residual_seats_calculation_table).toHaveTableContent([
      ["Totaal aantal zetels", "15", ""],
      ["Totaal aantal toegewezen volle zetels", "10", "— (min)"],
      ["Restzetels", "5", ""],
    ]);
  });

  describe("Apportionment not yet available", () => {
    test("Not available until data entry is finalised", async () => {
      overrideOnce("get", "/api/elections/1", 200, getElectionMockData(lt19Seats.election));
      overrideOnce("post", "/api/elections/1/apportionment", 412, {
        error: "Election data entry first needs to be finalised",
        fatal: false,
        reference: "ApportionmentNotAvailableUntilDataEntryFinalised",
      } satisfies ErrorResponse);

      renderApportionmentFullSeatsPage();

      // Wait for the page to be loaded
      expect(await screen.findByRole("heading", { level: 1, name: "Verdeling van de volle zetels" })).toBeVisible();

      expect(await screen.findByText("Zetelverdeling is nog niet beschikbaar")).toBeVisible();
      expect(
        await screen.findByText("De zetelverdeling kan pas gemaakt worden als alle stembureaus zijn ingevoerd"),
      ).toBeVisible();

      expect(screen.queryByTestId("full-seats-table")).not.toBeInTheDocument();
      expect(screen.queryByTestId("residual-seats-calculation-table")).not.toBeInTheDocument();
    });

    test("Not possible because drawing of lots is not implemented yet", async () => {
      overrideOnce("get", "/api/elections/1", 200, getElectionMockData(lt19Seats.election));
      overrideOnce("post", "/api/elections/1/apportionment", 422, {
        error: "Drawing of lots is required",
        fatal: false,
        reference: "DrawingOfLotsRequired",
      } satisfies ErrorResponse);

      renderApportionmentFullSeatsPage();

      // Wait for the page to be loaded
      expect(await screen.findByRole("heading", { level: 1, name: "Verdeling van de volle zetels" })).toBeVisible();

      expect(await screen.findByText("Zetelverdeling is niet mogelijk")).toBeVisible();
      expect(
        await screen.findByText("Loting is noodzakelijk, maar nog niet beschikbaar in deze versie van Abacus"),
      ).toBeVisible();

      expect(screen.queryByTestId("full-seats-table")).not.toBeInTheDocument();
      expect(screen.queryByTestId("residual-seats-calculation-table")).not.toBeInTheDocument();
    });

    test("Not possible because all lists are exhausted", async () => {
      overrideOnce("get", "/api/elections/1", 200, getElectionMockData(lt19Seats.election));
      overrideOnce("post", "/api/elections/1/apportionment", 422, {
        error: "All lists are exhausted, not enough candidates to fill all seats",
        fatal: false,
        reference: "AllListsExhausted",
      } satisfies ErrorResponse);

      renderApportionmentFullSeatsPage();

      // Wait for the page to be loaded
      expect(await screen.findByRole("heading", { level: 1, name: "Verdeling van de volle zetels" })).toBeVisible();

      expect(await screen.findByText("Zetelverdeling is niet mogelijk")).toBeVisible();
      expect(
        await screen.findByText(
          "Er zijn te weinig kandidaten om alle aan lijsten toegewezen zetels te vullen. Abacus kan daarom geen zetelverdeling berekenen. Neem contact op met de Kiesraad.",
        ),
      ).toBeVisible();

      expect(screen.queryByTestId("full-seats-table")).not.toBeInTheDocument();
      expect(screen.queryByTestId("residual-seats-calculation-table")).not.toBeInTheDocument();
    });

    test("Not possible because no votes on candidates cast", async () => {
      overrideOnce("get", "/api/elections/1", 200, getElectionMockData(lt19Seats.election));
      overrideOnce("post", "/api/elections/1/apportionment", 422, {
        error: "No votes on candidates cast",
        fatal: false,
        reference: "ZeroVotesCast",
      } satisfies ErrorResponse);

      renderApportionmentFullSeatsPage();

      // Wait for the page to be loaded
      expect(await screen.findByRole("heading", { level: 1, name: "Verdeling van de volle zetels" })).toBeVisible();

      expect(await screen.findByText("Zetelverdeling is niet mogelijk")).toBeVisible();
      expect(
        await screen.findByText(
          "Er zijn geen stemmen op kandidaten uitgebracht. Abacus kan daarom geen zetelverdeling berekenen. Neem contact op met de Kiesraad.",
        ),
      ).toBeVisible();

      expect(screen.queryByTestId("full-seats-table")).not.toBeInTheDocument();
      expect(screen.queryByTestId("residual-seats-calculation-table")).not.toBeInTheDocument();
    });

    test("Internal Server Error renders error page", async () => {
      // Since we test what happens after an error, we want vitest to ignore them
      vi.spyOn(console, "error").mockImplementation(() => {
        /* do nothing */
      });
      const router = setupTestRouter([
        {
          element: null,
          errorElement: <ErrorBoundary />,
          children: apportionmentRoutes,
        },
      ]);
      overrideOnce("get", "/api/elections/1", 200, getElectionMockData(lt19Seats.election));
      overrideOnce("post", "/api/elections/1/apportionment", 500, {
        error: "Internal Server Error",
        fatal: true,
        reference: "InternalServerError",
      });

      await router.navigate("/elections/1/apportionment/details-full-seats");

      rtlRender(<Providers router={router} />);

      await expectErrorPage();
    });
  });
});

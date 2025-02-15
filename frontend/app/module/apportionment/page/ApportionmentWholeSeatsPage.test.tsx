import { render as rtlRender } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import { apportionment, election, election_summary } from "app/component/apportionment/test-data/less-than-19-seats";
import { routes } from "app/routes";

import { ApportionmentProvider, ElectionApportionmentResponse, ElectionProvider, ErrorResponse } from "@kiesraad/api";
import { getElectionMockData } from "@kiesraad/api-mocks";
import { expectErrorPage, overrideOnce, Providers, render, screen, setupTestRouter } from "@kiesraad/test";

import { ApportionmentWholeSeatsPage } from "./ApportionmentWholeSeatsPage";

const renderApportionmentWholeSeatsPage = () =>
  render(
    <ElectionProvider electionId={1}>
      <ApportionmentProvider electionId={1}>
        <ApportionmentWholeSeatsPage />
      </ApportionmentProvider>
    </ElectionProvider>,
  );

describe("ApportionmentWholeSeatsPage", () => {
  test("Whole seats allocation and residual seats calculation tables visible", async () => {
    overrideOnce("get", "/api/elections/1", 200, getElectionMockData(election));
    overrideOnce("post", "/api/elections/1/apportionment", 200, {
      apportionment: apportionment,
      election_summary: election_summary,
    } satisfies ElectionApportionmentResponse);

    renderApportionmentWholeSeatsPage();

    expect(await screen.findByRole("heading", { level: 1, name: "Verdeling van de volle zetels" }));

    expect(await screen.findByRole("heading", { level: 2, name: "Hoe vaak haalde elke partij de kiesdeler?" }));
    const whole_seats_table = await screen.findByTestId("whole_seats_table");
    expect(whole_seats_table).toBeVisible();
    expect(whole_seats_table).toHaveTableContent([
      ["Lijst", "Aantal stemmen", ":", "Kiesdeler", "=", "Aantal volle zetels"],
      ["1", "808", ":", "80", "=", "10"],
      ["2", "60", ":", "80", "=", "0"],
      ["3", "58", ":", "80", "=", "0"],
      ["4", "57", ":", "80", "=", "0"],
      ["5", "56", ":", "80", "=", "0"],
      ["6", "55", ":", "80", "=", "0"],
      ["7", "54", ":", "80", "=", "0"],
      ["8", "52", ":", "80", "=", "0"],
    ]);

    expect(await screen.findByRole("heading", { level: 2, name: "Hoeveel restzetels zijn er te verdelen?" }));
    const residual_seats_calculation_table = await screen.findByTestId("residual_seats_calculation_table");
    expect(residual_seats_calculation_table).toBeVisible();
    expect(residual_seats_calculation_table).toHaveTableContent([
      ["Totaal aantal zetels", "15", ""],
      ["Totaal aantal toegewezen volle zetels", "10", "— min"],
      ["Restzetels", "5", ""],
    ]);
  });

  describe("Apportionment not yet available", () => {
    test("Not available until data entry is finalised", async () => {
      overrideOnce("get", "/api/elections/1", 200, getElectionMockData(election));
      overrideOnce("post", "/api/elections/1/apportionment", 412, {
        error: "Election data entry first needs to be finalised",
        fatal: false,
        reference: "ApportionmentNotAvailableUntilDataEntryFinalised",
      } satisfies ErrorResponse);

      renderApportionmentWholeSeatsPage();

      // Wait for the page to be loaded
      expect(await screen.findByRole("heading", { level: 1, name: "Verdeling van de volle zetels" }));

      expect(await screen.findByText("Zetelverdeling is nog niet beschikbaar")).toBeVisible();
      expect(
        await screen.findByText("De zetelverdeling kan pas gemaakt worden als alle stembureaus zijn ingevoerd"),
      ).toBeVisible();

      expect(screen.queryByTestId("whole_seats_table")).not.toBeInTheDocument();
      expect(screen.queryByTestId("residual_seats_calculation_table")).not.toBeInTheDocument();
    });

    test("Not available because drawing of lots is not implemented yet", async () => {
      overrideOnce("get", "/api/elections/1", 200, getElectionMockData(election));
      overrideOnce("post", "/api/elections/1/apportionment", 422, {
        error: "Drawing of lots is required",
        fatal: false,
        reference: "DrawingOfLotsRequired",
      } satisfies ErrorResponse);

      renderApportionmentWholeSeatsPage();

      // Wait for the page to be loaded
      expect(await screen.findByRole("heading", { level: 1, name: "Verdeling van de volle zetels" }));

      expect(await screen.findByText("Zetelverdeling is nog niet beschikbaar")).toBeVisible();
      expect(
        await screen.findByText("Loting is noodzakelijk, maar nog niet beschikbaar in deze versie van Abacus"),
      ).toBeVisible();

      expect(screen.queryByTestId("whole_seats_table")).not.toBeInTheDocument();
      expect(screen.queryByTestId("residual_seats_calculation_table")).not.toBeInTheDocument();
    });

    test("Internal Server Error renders error page", async () => {
      // Since we test what happens after an error, we want vitest to ignore them
      vi.spyOn(console, "error").mockImplementation(() => {
        /* do nothing */
      });
      const router = setupTestRouter(routes);

      overrideOnce("get", "/api/elections/1", 200, getElectionMockData(election));
      overrideOnce("post", "/api/elections/1/apportionment", 500, {
        error: "Internal Server Error",
        fatal: true,
        reference: "InternalServerError",
      });

      await router.navigate("/elections/1/apportionment/details-whole-seats");

      rtlRender(<Providers router={router} />);

      await expectErrorPage();
    });
  });
});

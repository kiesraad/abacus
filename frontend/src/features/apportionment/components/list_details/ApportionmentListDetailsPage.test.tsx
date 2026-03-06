import { render as rtlRender } from "@testing-library/react";
import * as ReactRouter from "react-router";
import { describe, expect, test, vi } from "vitest";

import { ErrorBoundary } from "@/components/error/ErrorBoundary";
import { ElectionProvider } from "@/hooks/election/ElectionProvider";
import { getElectionMockData } from "@/testing/api-mocks/ElectionMockData";
import { Providers } from "@/testing/Providers";
import { overrideOnce } from "@/testing/server";
import { expectErrorPage, render, screen, setupTestRouter } from "@/testing/test-utils";
import type { ElectionApportionmentResponse, ErrorResponse } from "@/types/generated/openapi";

import { apportionmentRoutes } from "../../routes";
import { candidate_nomination, election, election_summary, seat_assignment } from "../../testing/lt-19-seats";
import { ApportionmentProvider } from "../ApportionmentProvider";
import { ApportionmentListDetailsPage } from "./ApportionmentListDetailsPage";

const renderApportionmentPage = () =>
  render(
    <ElectionProvider electionId={1}>
      <ApportionmentProvider electionId={1}>
        <ApportionmentListDetailsPage />
      </ApportionmentProvider>
    </ElectionProvider>,
  );

describe("ApportionmentListDetailsPage", () => {
  test("All tables visible", async () => {
    vi.spyOn(ReactRouter, "useParams").mockReturnValue({ listNumber: "1" });
    overrideOnce("get", "/api/elections/1", 200, getElectionMockData(election));
    overrideOnce("post", "/api/elections/1/apportionment", 200, {
      seat_assignment: seat_assignment,
      candidate_nomination: candidate_nomination,
      election_summary: election_summary,
    } satisfies ElectionApportionmentResponse);

    renderApportionmentPage();

    expect(await screen.findByRole("heading", { level: 1, name: "Lijst 1 - Political Group A" })).toBeVisible();

    expect(await screen.findByRole("heading", { level: 2, name: "Toegewezen aantal zetels" })).toBeVisible();
    expect(await screen.findByTestId("text-list-assigned-nr-seats")).toHaveTextContent(
      "Lijst 1 - Political Group A heeft 12 zetels toegewezen gekregen.",
    );

    expect(
      await screen.findByRole("heading", { level: 2, name: "Met voorkeursstemmen gekozen kandidaten" }),
    ).toBeVisible();
    expect(await screen.findByTestId("text-preferentially-chosen-candidates")).toHaveTextContent(
      "De volgende kandidaten zijn met voorkeursstemmen gekozen. Deze kandidaten hebben meer dan 50% van de kiesdeler gehaald.",
    );
    const preferentially_chosen_candidates_table = await screen.findByTestId("preferentially-chosen-candidates-table");
    expect(preferentially_chosen_candidates_table).toBeVisible();
    expect(preferentially_chosen_candidates_table).toHaveTableContent([
      ["Zetel", "Naam", "Woonplaats", "Aantal stemmen"],
      ["1", "Kok, K. (Karin) (v)", "Test Location", "200"],
      ["2", "Oud, L. (Lidewij) (v)", "Test Location", "138"],
      ["3", "Van der Weijden, B. (Berta) (v)", "Test Location", "100"],
      ["4", "Oud, K. (Klaas) (m)", "Test Location", "60"],
      ["5", "Oud, M. (Marijke) (v)", "Test Location", "55"],
      ["6", "Van der Weijden, H. (Henk) (m)", "Test Location", "50"],
      ["7", "De Jong, R. (Rolf) (m)", "Test Location", "50"],
      ["8", "Jansen, A. (Arie) (m)", "Test Location", "45"],
      ["9", "Bakker, S. (Sophie) (v)", "Test Location", "40"],
    ]);

    expect(
      await screen.findByRole("heading", {
        level: 2,
        name: "Kandidaten die gekozen zijn vanwege hun positie op de lijst",
      }),
    ).toBeVisible();
    expect(await screen.findByTestId("text-other-chosen-candidates")).toHaveTextContent(
      "Deze kandidaten hebben zelfstandig niet voldoende stemmen gehaald voor een zetel, maar hebben een zetel toegewezen gekregen vanwege hun positie op de lijst.",
    );
    const other_chosen_candidates_table = await screen.findByTestId("other-chosen-candidates-table");
    expect(other_chosen_candidates_table).toBeVisible();
    expect(other_chosen_candidates_table).toHaveTableContent([
      ["Zetel", "Naam", "Woonplaats", "Positie op de lijst"],
      ["10", "Oud, J. (Johan) (m)", "Test Location", "2"],
      ["11", "De Vries, J. (Johan) (m)", "Test Location", "9"],
      ["12", "Van den Berg, M. (Marijke) (v)", "Test Location", "10"],
    ]);

    expect(await screen.findByRole("heading", { level: 2, name: "Rangschikking kandidaten" })).toBeVisible();
    expect(await screen.findByTestId("text-ranking-candidates")).toHaveTextContent(
      "De kandidaten zijn gerangschikt in de volgorde zoals hieronder aangegeven.",
    );
    const candidates_ranking_table = await screen.findByTestId("candidates-ranking-table");
    expect(candidates_ranking_table).toBeVisible();
    expect(candidates_ranking_table).toHaveTableContent([
      ["Rang", "Naam", "Woonplaats", "Positie op de lijst"],
      ["1", "Kok, K. (Karin) (v)", "Test Location", "12"],
      ["2", "Oud, L. (Lidewij) (v)", "Test Location", "1"],
      ["3", "Van der Weijden, B. (Berta) (v)", "Test Location", "6"],
      ["4", "Oud, K. (Klaas) (m)", "Test Location", "7"],
      ["5", "Oud, M. (Marijke) (v)", "Test Location", "3"],
      ["6", "Van der Weijden, H. (Henk) (m)", "Test Location", "5"],
      ["7", "De Jong, R. (Rolf) (m)", "Test Location", "11"],
      ["8", "Jansen, A. (Arie) (m)", "Test Location", "4"],
      ["9", "Bakker, S. (Sophie) (v)", "Test Location", "8"],
      ["10", "Oud, J. (Johan) (m)", "Test Location", "2"],
      ["11", "De Vries, J. (Johan) (m)", "Test Location", "9"],
      ["12", "Van den Berg, M. (Marijke) (v)", "Test Location", "10"],
    ]);

    expect(await screen.findByRole("heading", { level: 2, name: "Totaal aantal stemmen per kandidaat" })).toBeVisible();
    const total_votes_per_candidate_table = await screen.findByTestId("total-votes-per-candidate-table");
    expect(total_votes_per_candidate_table).toBeVisible();
    expect(total_votes_per_candidate_table).toHaveTableContent([
      ["Nummer", "Naam", "Woonplaats", "Aantal stemmen"],
      ["1", "Oud, L. (Lidewij) (v)", "Test Location", "138"],
      ["2", "Oud, J. (Johan) (m)", "Test Location", "20"],
      ["3", "Oud, M. (Marijke) (v)", "Test Location", "55"],
      ["4", "Jansen, A. (Arie) (m)", "Test Location", "45"],
      ["5", "Van der Weijden, H. (Henk) (m)", "Test Location", "50"],
      ["6", "Van der Weijden, B. (Berta) (v)", "Test Location", "100"],
      ["7", "Oud, K. (Klaas) (m)", "Test Location", "60"],
      ["8", "Bakker, S. (Sophie) (v)", "Test Location", "40"],
      ["9", "De Vries, J. (Johan) (m)", "Test Location", "30"],
      ["10", "Van den Berg, M. (Marijke) (v)", "Test Location", "20"],
      ["11", "De Jong, R. (Rolf) (m)", "Test Location", "50"],
      ["12", "Kok, K. (Karin) (v)", "Test Location", "200"],
    ]);
  });

  test("No tables visible because 0 seats assigned", async () => {
    vi.spyOn(ReactRouter, "useParams").mockReturnValue({ listNumber: "5" });
    overrideOnce("get", "/api/elections/1", 200, getElectionMockData(election));
    overrideOnce("post", "/api/elections/1/apportionment", 200, {
      seat_assignment: seat_assignment,
      candidate_nomination: candidate_nomination,
      election_summary: election_summary,
    } satisfies ElectionApportionmentResponse);

    renderApportionmentPage();

    expect(await screen.findByRole("heading", { level: 1, name: "Lijst 5" })).toBeVisible();

    expect(await screen.findByRole("heading", { level: 2, name: "Toegewezen aantal zetels" })).toBeVisible();
    expect(await screen.findByTestId("text-list-assigned-nr-seats")).toHaveTextContent(
      "Lijst 5 heeft 0 zetels toegewezen gekregen.",
    );

    expect(
      await screen.findByRole("heading", { level: 2, name: "Met voorkeursstemmen gekozen kandidaten" }),
    ).toBeVisible();
    expect(await screen.findByTestId("text-preferentially-chosen-candidates")).toHaveTextContent(
      "Geen van de kandidaten heeft meer dan 50% van de kiesdeler gehaald. Niemand is met voorkeursstemmen gekozen.",
    );
    expect(screen.queryByTestId("preferentially-chosen-candidates-table")).not.toBeInTheDocument();

    expect(
      await screen.findByRole("heading", {
        level: 2,
        name: "Kandidaten die gekozen zijn vanwege hun positie op de lijst",
      }),
    ).toBeVisible();
    expect(await screen.findByTestId("text-other-chosen-candidates")).toHaveTextContent(
      "Geen enkele kandidaat is zonder voorkeursstemmen gekozen.",
    );
    expect(screen.queryByTestId("other-chosen-candidates-table")).not.toBeInTheDocument();

    expect(await screen.findByRole("heading", { level: 2, name: "Rangschikking kandidaten" })).toBeVisible();
    expect(await screen.findByTestId("text-ranking-candidates")).toHaveTextContent(
      "De kandidaten zijn gerangschikt in de volgorde zoals ze op de lijst stonden.",
    );
    expect(screen.queryByTestId("candidates-ranking-table")).not.toBeInTheDocument();

    expect(await screen.findByRole("heading", { level: 2, name: "Totaal aantal stemmen per kandidaat" })).toBeVisible();
    const total_votes_per_candidate_table = await screen.findByTestId("total-votes-per-candidate-table");
    expect(total_votes_per_candidate_table).toBeVisible();
    expect(total_votes_per_candidate_table).toHaveTableContent([
      ["Nummer", "Naam", "Woonplaats", "Aantal stemmen"],
      ["1", "Smit, G. (Gert) (m)", "Test Location", "20"],
      ["2", "Koster, E. (Eva) (v)", "Test Location", "15"],
      ["3", "Hofman, L. (Leon) (m)", "Test Location", "5"],
      ["4", "Visser, S. (Sophie) (v)", "Test Location", "16"],
    ]);
  });

  describe("Apportionment not yet available", () => {
    test("Not available until committee session is completed", async () => {
      vi.spyOn(ReactRouter, "useParams").mockReturnValue({ listNumber: "1" });
      overrideOnce("get", "/api/elections/1", 200, getElectionMockData(election));
      overrideOnce("post", "/api/elections/1/apportionment", 412, {
        error: "Committee session not completed",
        fatal: false,
        reference: "ApportionmentCommitteeSessionNotCompleted",
      } satisfies ErrorResponse);

      renderApportionmentPage();

      // Wait for the page to be loaded
      expect(await screen.findByRole("heading", { level: 1, name: "Lijst 1 - Political Group A" })).toBeVisible();

      expect(await screen.findByText("Zetelverdeling is nog niet beschikbaar")).toBeVisible();
      expect(
        await screen.findByText("De zetelverdeling kan pas gemaakt worden als de zitting is afgerond"),
      ).toBeVisible();

      expect(screen.queryByTestId("preferentially-chosen-candidates-table")).not.toBeInTheDocument();
      expect(screen.queryByTestId("other-chosen-candidates-table")).not.toBeInTheDocument();
      expect(screen.queryByTestId("candidates-ranking-table")).not.toBeInTheDocument();
      expect(screen.queryByTestId("total-votes-per-candidate-table")).not.toBeInTheDocument();
    });

    test("Not possible because drawing of lots is not implemented yet", async () => {
      vi.spyOn(ReactRouter, "useParams").mockReturnValue({ listNumber: "1" });
      overrideOnce("get", "/api/elections/1", 200, getElectionMockData(election));
      overrideOnce("post", "/api/elections/1/apportionment", 422, {
        error: "Drawing of lots is required",
        fatal: false,
        reference: "ApportionmentDrawingOfLotsRequired",
      } satisfies ErrorResponse);

      renderApportionmentPage();

      // Wait for the page to be loaded
      expect(await screen.findByRole("heading", { level: 1, name: "Lijst 1 - Political Group A" })).toBeVisible();

      expect(await screen.findByText("Zetelverdeling is niet mogelijk")).toBeVisible();
      expect(
        await screen.findByText("Loting is noodzakelijk, maar nog niet beschikbaar in deze versie van Abacus"),
      ).toBeVisible();

      expect(screen.queryByTestId("preferentially-chosen-candidates-table")).not.toBeInTheDocument();
      expect(screen.queryByTestId("other-chosen-candidates-table")).not.toBeInTheDocument();
      expect(screen.queryByTestId("candidates-ranking-table")).not.toBeInTheDocument();
      expect(screen.queryByTestId("total-votes-per-candidate-table")).not.toBeInTheDocument();
    });

    test("Not possible because all lists are exhausted", async () => {
      vi.spyOn(ReactRouter, "useParams").mockReturnValue({ listNumber: "1" });
      overrideOnce("get", "/api/elections/1", 200, getElectionMockData(election));
      overrideOnce("post", "/api/elections/1/apportionment", 422, {
        error: "All lists are exhausted, not enough candidates to fill all seats",
        fatal: false,
        reference: "ApportionmentAllListsExhausted",
      } satisfies ErrorResponse);

      renderApportionmentPage();

      // Wait for the page to be loaded
      expect(await screen.findByRole("heading", { level: 1, name: "Lijst 1 - Political Group A" })).toBeVisible();

      expect(await screen.findByText("Zetelverdeling is niet mogelijk")).toBeVisible();
      expect(
        await screen.findByText(
          "Er zijn te weinig kandidaten om alle aan lijsten toegewezen zetels te vullen. Abacus kan daarom geen zetelverdeling berekenen. Neem contact op met de Kiesraad.",
        ),
      ).toBeVisible();

      expect(screen.queryByTestId("preferentially-chosen-candidates-table")).not.toBeInTheDocument();
      expect(screen.queryByTestId("other-chosen-candidates-table")).not.toBeInTheDocument();
      expect(screen.queryByTestId("candidates-ranking-table")).not.toBeInTheDocument();
      expect(screen.queryByTestId("total-votes-per-candidate-table")).not.toBeInTheDocument();
    });

    test("Internal Server Error renders error page", async () => {
      vi.spyOn(ReactRouter, "useParams").mockReturnValue({ listNumber: "1" });
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

      overrideOnce("get", "/api/elections/1", 200, getElectionMockData(election));
      overrideOnce("post", "/api/elections/1/apportionment", 500, {
        error: "Internal Server Error",
        fatal: true,
        reference: "InternalServerError",
      });

      await router.navigate("/elections/1/apportionment/1");

      rtlRender(<Providers router={router} />);

      await expectErrorPage();
    });
  });
});

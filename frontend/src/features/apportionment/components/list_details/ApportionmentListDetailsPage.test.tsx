import { render as rtlRender } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import { ElectionApportionmentResponse, ElectionProvider, ErrorResponse } from "@/api";
// eslint-disable-next-line import/no-restricted-paths -- #1283
import { routes } from "@/app/routes";
import { expectErrorPage, overrideOnce, Providers, render, screen, setupTestRouter } from "@/testing";
import { getElectionMockData } from "@/testing/api-mocks";

import { candidate_nomination, election, election_summary, seat_assignment } from "../../testing/lt-19-seats";
import { ApportionmentProvider } from "../ApportionmentProvider";
import { ApportionmentListDetailsPage } from "./ApportionmentListDetailsPage";

const { mockedUseNumericParam } = vi.hoisted(() => {
  return { mockedUseNumericParam: vi.fn() };
});

vi.mock(import("@/lib/util"), async (importOriginal) => ({
  ...(await importOriginal()),
  useNumericParam: mockedUseNumericParam,
}));

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
    mockedUseNumericParam.mockReturnValue(1);
    overrideOnce("get", "/api/elections/1", 200, getElectionMockData(election));
    overrideOnce("post", "/api/elections/1/apportionment", 200, {
      seat_assignment: seat_assignment,
      candidate_nomination: candidate_nomination,
      election_summary: election_summary,
    } satisfies ElectionApportionmentResponse);

    renderApportionmentPage();

    expect(await screen.findByRole("heading", { level: 1, name: "Lijst 1 - Political Group A" }));

    expect(await screen.findByRole("heading", { level: 2, name: "Toegewezen aantal zetels" }));
    expect(await screen.findByTestId("text-political-group-assigned-nr-seats")).toHaveTextContent(
      "Lijst 1 - Political Group A heeft 12 zetels toegewezen gekregen.",
    );

    expect(await screen.findByRole("heading", { level: 2, name: "Met voorkeur gekozen kandidaten" }));
    expect(await screen.findByTestId("text-preferentially-chosen-candidates")).toHaveTextContent(
      "De volgende kandidaten zijn met voorkeursstemmen gekozen. Deze kandidaten hebben meer dan 50% van de kiesdeler gehaald.",
    );
    const preferentially_chosen_candidates_table = await screen.findByTestId("preferentially-chosen-candidates-table");
    expect(preferentially_chosen_candidates_table).toBeVisible();
    expect(preferentially_chosen_candidates_table).toHaveTableContent([
      ["Kandidaat", "Woonplaats", "Aantal stemmen"],
      ["Kok, K. (Karin) (v)", "Test Location", "200"],
      ["Oud, L. (Lidewij) (v)", "Test Location", "138"],
      ["Van der Weijden, B. (Berta) (v)", "Test Location", "100"],
      ["Oud, K. (Klaas) (m)", "Test Location", "60"],
      ["Oud, M. (Marijke) (v)", "Test Location", "55"],
      ["Van der Weijden, H. (Henk) (m)", "Test Location", "50"],
      ["De Jong, R. (Rolf) (m)", "Test Location", "50"],
      ["Jansen, A. (Arie) (m)", "Test Location", "45"],
      ["Bakker, S. (Sophie) (v)", "Test Location", "40"],
    ]);

    expect(await screen.findByRole("heading", { level: 2, name: "Overige gekozen kandidaten" }));
    expect(await screen.findByTestId("text-other-chosen-candidates")).toHaveTextContent(
      "De overige aan de lijst toegewezen zetels gaan naar de volgende kandidaten.",
    );
    const other_chosen_candidates_table = await screen.findByTestId("other-chosen-candidates-table");
    expect(other_chosen_candidates_table).toBeVisible();
    expect(other_chosen_candidates_table).toHaveTableContent([
      ["Kandidaat", "Woonplaats", "Aantal stemmen"],
      ["Oud, J. (Johan) (m)", "Test Location", "20"],
      ["De Vries, J. (Johan) (m)", "Test Location", "30"],
      ["Van den Berg, M. (Marijke) (v)", "Test Location", "20"],
    ]);

    expect(await screen.findByRole("heading", { level: 2, name: "Rangschikking kandidaten" }));
    expect(await screen.findByTestId("text-ranking-candidates")).toHaveTextContent(
      "De kandidaten zijn gerangschikt in de volgorde zoals hieronder aangegeven.",
    );
    const candidates_ranking_table = await screen.findByTestId("candidates-ranking-table");
    expect(candidates_ranking_table).toBeVisible();
    expect(candidates_ranking_table).toHaveTableContent([
      ["Kandidaat", "Woonplaats"],
      ["Kok, K. (Karin) (v)", "Test Location"],
      ["Oud, L. (Lidewij) (v)", "Test Location"],
      ["Van der Weijden, B. (Berta) (v)", "Test Location"],
      ["Oud, K. (Klaas) (m)", "Test Location"],
      ["Oud, M. (Marijke) (v)", "Test Location"],
      ["Van der Weijden, H. (Henk) (m)", "Test Location"],
      ["De Jong, R. (Rolf) (m)", "Test Location"],
      ["Jansen, A. (Arie) (m)", "Test Location"],
      ["Bakker, S. (Sophie) (v)", "Test Location"],
      ["Oud, J. (Johan) (m)", "Test Location"],
      ["De Vries, J. (Johan) (m)", "Test Location"],
      ["Van den Berg, M. (Marijke) (v)", "Test Location"],
    ]);

    expect(await screen.findByRole("heading", { level: 2, name: "Totaal aantal stemmen per kandidaat" }));
    const total_votes_per_candidate_table = await screen.findByTestId("total-votes-per-candidate-table");
    expect(total_votes_per_candidate_table).toBeVisible();
    expect(total_votes_per_candidate_table).toHaveTableContent([
      ["Nummer", "Kandidaat", "Aantal stemmen"],
      ["1", "Oud, L. (Lidewij) (v)", "138"],
      ["2", "Oud, J. (Johan) (m)", "20"],
      ["3", "Oud, M. (Marijke) (v)", "55"],
      ["4", "Jansen, A. (Arie) (m)", "45"],
      ["5", "Van der Weijden, H. (Henk) (m)", "50"],
      ["6", "Van der Weijden, B. (Berta) (v)", "100"],
      ["7", "Oud, K. (Klaas) (m)", "60"],
      ["8", "Bakker, S. (Sophie) (v)", "40"],
      ["9", "De Vries, J. (Johan) (m)", "30"],
      ["10", "Van den Berg, M. (Marijke) (v)", "20"],
      ["11", "De Jong, R. (Rolf) (m)", "50"],
      ["12", "Kok, K. (Karin) (v)", "200"],
    ]);
  });

  test("No tables visible because 0 seats assigned", async () => {
    mockedUseNumericParam.mockReturnValue(5);
    overrideOnce("get", "/api/elections/1", 200, getElectionMockData(election));
    overrideOnce("post", "/api/elections/1/apportionment", 200, {
      seat_assignment: seat_assignment,
      candidate_nomination: candidate_nomination,
      election_summary: election_summary,
    } satisfies ElectionApportionmentResponse);

    renderApportionmentPage();

    expect(await screen.findByRole("heading", { level: 1, name: "Lijst 5 - Political Group E" }));

    expect(await screen.findByRole("heading", { level: 2, name: "Toegewezen aantal zetels" }));
    expect(await screen.findByTestId("text-political-group-assigned-nr-seats")).toHaveTextContent(
      "Lijst 5 - Political Group E heeft 0 zetels toegewezen gekregen.",
    );

    expect(await screen.findByRole("heading", { level: 2, name: "Met voorkeur gekozen kandidaten" }));
    expect(await screen.findByTestId("text-preferentially-chosen-candidates")).toHaveTextContent(
      "Geen van de kandidaten heeft meer dan 50% van de kiesdeler gehaald. Niemand is met voorkeursstemmen gekozen.",
    );
    expect(screen.queryByTestId("preferentially-chosen-candidates-table")).not.toBeInTheDocument();

    expect(await screen.findByRole("heading", { level: 2, name: "Overige gekozen kandidaten" }));
    expect(await screen.findByTestId("text-other-chosen-candidates")).toHaveTextContent(
      "Er zijn geen andere kandidaten gekozen.",
    );
    expect(screen.queryByTestId("other-chosen-candidates-table")).not.toBeInTheDocument();

    expect(await screen.findByRole("heading", { level: 2, name: "Rangschikking kandidaten" }));
    expect(await screen.findByTestId("text-ranking-candidates")).toHaveTextContent(
      "De kandidaten zijn gerangschikt in de volgorde zoals ze op de lijst stonden.",
    );
    expect(screen.queryByTestId("candidates-ranking-table")).not.toBeInTheDocument();

    expect(await screen.findByRole("heading", { level: 2, name: "Totaal aantal stemmen per kandidaat" }));
    const total_votes_per_candidate_table = await screen.findByTestId("total-votes-per-candidate-table");
    expect(total_votes_per_candidate_table).toBeVisible();
    expect(total_votes_per_candidate_table).toHaveTableContent([
      ["Nummer", "Kandidaat", "Aantal stemmen"],
      ["1", "Smit, G. (Gert) (m)", "20"],
      ["2", "Koster, E. (Eva) (v)", "15"],
      ["3", "Hofman, L. (Leon) (m)", "5"],
      ["4", "Visser, S. (Sophie) (v)", "16"],
    ]);
  });

  describe("Apportionment not yet available", () => {
    test("Not available until data entry is finalised", async () => {
      mockedUseNumericParam.mockReturnValue(1);
      overrideOnce("get", "/api/elections/1", 200, getElectionMockData(election));
      overrideOnce("post", "/api/elections/1/apportionment", 412, {
        error: "Election data entry first needs to be finalised",
        fatal: false,
        reference: "ApportionmentNotAvailableUntilDataEntryFinalised",
      } satisfies ErrorResponse);

      renderApportionmentPage();

      // Wait for the page to be loaded
      expect(await screen.findByRole("heading", { level: 1, name: "Lijst 1 - Political Group A" }));

      expect(await screen.findByText("Zetelverdeling is nog niet beschikbaar")).toBeVisible();
      expect(
        await screen.findByText("De zetelverdeling kan pas gemaakt worden als alle stembureaus zijn ingevoerd"),
      ).toBeVisible();

      expect(screen.queryByTestId("preferentially-chosen-candidates-table")).not.toBeInTheDocument();
      expect(screen.queryByTestId("other-chosen-candidates-table")).not.toBeInTheDocument();
      expect(screen.queryByTestId("candidates-ranking-table")).not.toBeInTheDocument();
      expect(screen.queryByTestId("total-votes-per-candidate-table")).not.toBeInTheDocument();
    });

    test("Not possible because drawing of lots is not implemented yet", async () => {
      mockedUseNumericParam.mockReturnValue(1);
      overrideOnce("get", "/api/elections/1", 200, getElectionMockData(election));
      overrideOnce("post", "/api/elections/1/apportionment", 422, {
        error: "Drawing of lots is required",
        fatal: false,
        reference: "DrawingOfLotsRequired",
      } satisfies ErrorResponse);

      renderApportionmentPage();

      // Wait for the page to be loaded
      expect(await screen.findByRole("heading", { level: 1, name: "Lijst 1 - Political Group A" }));

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
      mockedUseNumericParam.mockReturnValue(1);
      overrideOnce("get", "/api/elections/1", 200, getElectionMockData(election));
      overrideOnce("post", "/api/elections/1/apportionment", 422, {
        error: "All lists are exhausted, not enough candidates to fill all seats",
        fatal: false,
        reference: "AllListsExhausted",
      } satisfies ErrorResponse);

      renderApportionmentPage();

      // Wait for the page to be loaded
      expect(await screen.findByRole("heading", { level: 1, name: "Lijst 1 - Political Group A" }));

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
      mockedUseNumericParam.mockReturnValue(1);
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

      await router.navigate("/elections/1/apportionment/1");

      rtlRender(<Providers router={router} />);

      await expectErrorPage();
    });
  });
});

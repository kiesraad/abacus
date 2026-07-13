import { render as rtlRender } from "@testing-library/react";
import * as ReactRouter from "react-router";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { ErrorBoundary } from "@/components/error/ErrorBoundary";
import alertCls from "@/components/ui/Alert/Alert.module.css";
import { ElectionProvider } from "@/hooks/election/ElectionProvider";
import { getElectionMockData } from "@/testing/api-mocks/ElectionMockData";
import { Providers } from "@/testing/Providers";
import { overrideOnce } from "@/testing/server";
import { expectErrorPage, render, screen, setupTestRouter, waitFor } from "@/testing/test-utils";
import type { ApportionmentState, ElectionApportionmentResponse, ErrorResponse } from "@/types/generated/openapi";
import { apportionmentRoutes } from "../../routes";
import * as lt19Seats from "../../testing/lt-19-seats";
import * as lt19SeatsAndP15DrawingLots from "../../testing/lt-19-seats-and-p15-drawing-lots";
import { ApportionmentProvider } from "../ApportionmentProvider";
import { ApportionmentListDetailsPage } from "./ApportionmentListDetailsPage";

const navigate = vi.fn();

const renderApportionmentListDetailsPage = (electionId: number) =>
  render(
    <ElectionProvider electionId={electionId}>
      <ApportionmentProvider electionId={electionId}>
        <ApportionmentListDetailsPage />
      </ApportionmentProvider>
    </ElectionProvider>,
  );

describe("ApportionmentListDetailsPage", () => {
  beforeEach(() => {
    overrideOnce("get", "/api/elections/3", 200, getElectionMockData(lt19Seats.election, lt19Seats.committee_session));
    overrideOnce("get", "/api/elections/3/apportionment/state", 200, {
      deceased_candidates: [
        { pg_number: 1, candidate_number: 12 },
        { pg_number: 2, candidate_number: 3 },
        { pg_number: 1, candidate_number: 5 },
      ],
      lists_drawn: [],
      candidates_drawn: [],
      type: "Finalised",
    } satisfies ApportionmentState);
    overrideOnce("post", "/api/elections/3/apportionment", 200, {
      seat_assignment: lt19Seats.seat_assignment,
      candidate_nomination: lt19Seats.candidate_nomination,
      election_summary: lt19Seats.election_summary,
      warnings: [],
    } satisfies ElectionApportionmentResponse);
  });

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
        expectRedirectTo: "/elections/3/apportionment",
      },
      Finalised: {
        state: { deceased_candidates: [], lists_drawn: [], candidates_drawn: [], type: "Finalised" },
        expectRedirectTo: undefined,
      },
    } satisfies Record<
      ApportionmentState["type"],
      { state: ApportionmentState; expectRedirectTo: string | undefined }
    >),
  )("Does not redirect only for finalised state ($state.type)", async ({ state, expectRedirectTo }) => {
    vi.spyOn(ReactRouter, "useNavigate").mockImplementation(() => navigate);
    vi.spyOn(ReactRouter, "useParams").mockReturnValue({ listNumber: "1" });
    overrideOnce("get", "/api/elections/3/apportionment/state", 200, state);

    renderApportionmentListDetailsPage(3);
    expect(await screen.findByRole("heading", { level: 1, name: "Lijst 1 – Political Group A" })).toBeVisible();

    if (expectRedirectTo) {
      await waitFor(() => {
        expect(navigate).toHaveBeenCalledWith(expectRedirectTo);
      });
    } else {
      expect(navigate).not.toHaveBeenCalled();
    }
  });

  test("Tables rendering when all candidates chosen and 2 deceased candidates", async () => {
    vi.spyOn(ReactRouter, "useParams").mockReturnValue({ listNumber: "1" });

    renderApportionmentListDetailsPage(3);

    expect(await screen.findByRole("heading", { level: 1, name: "Lijst 1 – Political Group A" })).toBeVisible();

    expect(await screen.findByRole("heading", { level: 2, name: "Toegewezen aantal zetels" })).toBeVisible();
    expect(await screen.findByTestId("text-list-assigned-nr-seats")).toHaveTextContent(
      "Lijst 1 – Political Group A heeft 12 zetels toegewezen gekregen.",
    );
    const deceasedCandidatesAlert = await screen.findByRole("alert");
    expect(deceasedCandidatesAlert).toHaveTextContent(
      "Kandidaten 5 en 12 zijn buiten beschouwing gelaten bij het verdelen van de zetels vanwege overlijden.Stemmen op overleden kandidaten zijn wel meegeteld als stemmen op diens lijst.",
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
      ["3", "Van der Weijden, B. (Berta) (v)", "Test Location (BE)", "100"],
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
      ["Zetel", "Naam", "Woonplaats", "Positie op lijst"],
      ["10", "Oud, J. (Johan) (m)", "Test Location", "2"],
      ["11", "De Vries, J. (Johan) (m)", "Test Location", "9"],
      ["12", "Van den Berg, M. (Marijke) (v)", "Test Location", "10"],
    ]);

    expect(
      await screen.findByRole("heading", { level: 2, name: "Rangschikking van kandidaten voor opvolging" }),
    ).toBeVisible();
    expect(await screen.findByTestId("text-ranking-candidates")).toHaveTextContent(
      "Geen enkele kandidaat is niet gekozen.",
    );
    expect(screen.queryByTestId("candidates-ranking-table")).not.toBeInTheDocument();

    expect(await screen.findByRole("heading", { level: 2, name: "Totaal aantal stemmen per kandidaat" })).toBeVisible();
    const total_votes_per_candidate_table = await screen.findByTestId("total-votes-per-candidate-table");
    expect(total_votes_per_candidate_table).toBeVisible();
    expect(total_votes_per_candidate_table).toHaveTableContent([
      ["Nummer", "Kandidaat", "Woonplaats", "Aantal stemmen"],
      ["1", "Oud, L. (Lidewij) (v)", "Test Location", "138"],
      ["2", "Oud, J. (Johan) (m)", "Test Location", "20"],
      ["3", "Oud, M. (Marijke) (v)", "Test Location", "55"],
      ["4", "Jansen, A. (Arie) (m)", "Test Location", "45"],
      ["5", "Van der Weijden, H. (Henk) (m) †", "Test Location", "50"],
      ["6", "Van der Weijden, B. (Berta) (v)", "Test Location (BE)", "100"],
      ["7", "Oud, K. (Klaas) (m)", "Test Location", "60"],
      ["8", "Bakker, S. (Sophie) (v)", "Test Location", "40"],
      ["9", "De Vries, J. (Johan) (m)", "Test Location", "30"],
      ["10", "Van den Berg, M. (Marijke) (v)", "Test Location", "20"],
      ["11", "De Jong, R. (Rolf) (m)", "Test Location", "50"],
      ["12", "Kok, K. (Karin) (v) †", "Test Location", "200"],
    ]);
  });

  test("Tables rendering when no preferentially chosen candidate and not all candidates chosen and deceased candidate", async () => {
    vi.spyOn(ReactRouter, "useParams").mockReturnValue({ listNumber: "2" });

    renderApportionmentListDetailsPage(3);

    expect(await screen.findByRole("heading", { level: 1, name: "Lijst 2 – Political Group B" })).toBeVisible();

    expect(await screen.findByRole("heading", { level: 2, name: "Toegewezen aantal zetels" })).toBeVisible();
    expect(await screen.findByTestId("text-list-assigned-nr-seats")).toHaveTextContent(
      "Lijst 2 – Political Group B heeft 1 zetel toegewezen gekregen.",
    );
    const deceasedCandidatesAlert = await screen.findByRole("alert");
    expect(deceasedCandidatesAlert).toHaveTextContent(
      "Kandidaat 3 is buiten beschouwing gelaten bij het verdelen van de zetels vanwege overlijden.Stemmen op overleden kandidaten zijn wel meegeteld als stemmen op diens lijst.",
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
      "Deze kandidaten hebben zelfstandig niet voldoende stemmen gehaald voor een zetel, maar hebben een zetel toegewezen gekregen vanwege hun positie op de lijst.",
    );
    const other_chosen_candidates_table = await screen.findByTestId("other-chosen-candidates-table");
    expect(other_chosen_candidates_table).toBeVisible();
    expect(other_chosen_candidates_table).toHaveTableContent([
      ["Zetel", "Naam", "Woonplaats", "Positie op lijst"],
      ["1", "Bakker, T. (Tinus) (m)", "Test Location (BE)", "1"],
    ]);

    expect(
      await screen.findByRole("heading", { level: 2, name: "Rangschikking van kandidaten voor opvolging" }),
    ).toBeVisible();
    expect(await screen.findByTestId("text-ranking-candidates")).toHaveTextContent(
      "De volgende kandidaten hebben geen zetel toegewezen gekregen. Als een zetel vrijkomt wordt deze via de onderstaande volgorde aan opvolgers toegewezen.",
    );
    const candidates_ranking_table = await screen.findByTestId("candidates-ranking-table");
    expect(candidates_ranking_table).toBeVisible();
    expect(candidates_ranking_table).toHaveTableContent([
      ["Rang", "Naam", "Woonplaats", "Positie op lijst"],
      ["1", "Po, D. (x)", "Test Location", "2"],
      ["2", "De Vries, W. (Willem) (m)", "Test Location", "3"],
      ["3", "Kloosterboer, K. (Klaas) (m)", "Test Location", "4"],
      ["4", "Jansen, L. (Liesbeth) (v)", "Test Location", "5"],
      ["5", "Van den Berg, H. (Henk) (m)", "Test Location", "6"],
    ]);

    expect(await screen.findByRole("heading", { level: 2, name: "Totaal aantal stemmen per kandidaat" })).toBeVisible();
    const total_votes_per_candidate_table = await screen.findByTestId("total-votes-per-candidate-table");
    expect(total_votes_per_candidate_table).toBeVisible();
    expect(total_votes_per_candidate_table).toHaveTableContent([
      ["Nummer", "Kandidaat", "Woonplaats", "Aantal stemmen"],
      ["1", "Bakker, T. (Tinus) (m)", "Test Location (BE)", "20"],
      ["2", "Po, D. (x)", "Test Location", "15"],
      ["3", "De Vries, W. (Willem) (m) †", "Test Location", "5"],
      ["4", "Kloosterboer, K. (Klaas) (m)", "Test Location", "3"],
      ["5", "Jansen, L. (Liesbeth) (v)", "Test Location", "2"],
      ["6", "Van den Berg, H. (Henk) (m)", "Test Location", "15"],
    ]);
  });

  test("Tables rendering when 0 seats assigned and no deceased candidates", async () => {
    vi.spyOn(ReactRouter, "useParams").mockReturnValue({ listNumber: "5" });

    renderApportionmentListDetailsPage(3);

    expect(await screen.findByRole("heading", { level: 1, name: "Lijst 5 – Blanco (Smit, G.)" })).toBeVisible();

    expect(await screen.findByRole("heading", { level: 2, name: "Toegewezen aantal zetels" })).toBeVisible();
    expect(await screen.findByTestId("text-list-assigned-nr-seats")).toHaveTextContent(
      "Lijst 5 – Blanco (Smit, G.) heeft 0 zetels toegewezen gekregen.",
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();

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

    expect(
      await screen.findByRole("heading", { level: 2, name: "Rangschikking van kandidaten voor opvolging" }),
    ).toBeVisible();
    expect(await screen.findByTestId("text-ranking-candidates")).toHaveTextContent(
      "De volgende kandidaten hebben geen zetel toegewezen gekregen. Als een zetel vrijkomt wordt deze via de onderstaande volgorde aan opvolgers toegewezen.",
    );
    const candidates_ranking_table = await screen.findByTestId("candidates-ranking-table");
    expect(candidates_ranking_table).toBeVisible();
    expect(candidates_ranking_table).toHaveTableContent([
      ["Rang", "Naam", "Woonplaats", "Positie op lijst"],
      ["1", "Smit, G. (Gert) (m)", "Test Location", "1"],
      ["2", "Koster, E. (Eva) (v)", "Test Location", "2"],
      ["3", "Hofman, L. (Leon) (m)", "Test Location", "3"],
      ["4", "Visser, S. (Sophie) (v)", "Test Location", "4"],
    ]);

    expect(await screen.findByRole("heading", { level: 2, name: "Totaal aantal stemmen per kandidaat" })).toBeVisible();
    const total_votes_per_candidate_table = await screen.findByTestId("total-votes-per-candidate-table");
    expect(total_votes_per_candidate_table).toBeVisible();
    expect(total_votes_per_candidate_table).toHaveTableContent([
      ["Nummer", "Kandidaat", "Woonplaats", "Aantal stemmen"],
      ["1", "Smit, G. (Gert) (m)", "Test Location", "20"],
      ["2", "Koster, E. (Eva) (v)", "Test Location", "15"],
      ["3", "Hofman, L. (Leon) (m)", "Test Location", "5"],
      ["4", "Visser, S. (Sophie) (v)", "Test Location", "16"],
    ]);
  });

  describe("Drawing lots candidates", () => {
    beforeEach(() => {
      overrideOnce(
        "get",
        "/api/elections/11",
        200,
        getElectionMockData(lt19SeatsAndP15DrawingLots.election, lt19SeatsAndP15DrawingLots.committee_session),
      );
      overrideOnce("post", "/api/elections/11/apportionment", 200, {
        seat_assignment: lt19SeatsAndP15DrawingLots.seat_assignment,
        candidate_nomination: lt19SeatsAndP15DrawingLots.candidate_nomination,
        election_summary: lt19SeatsAndP15DrawingLots.election_summary,
        warnings: [],
      } satisfies ElectionApportionmentResponse);
      overrideOnce(
        "get",
        "/api/elections/11/apportionment/state",
        200,
        lt19SeatsAndP15DrawingLots.state_after_three_drawing_lots_candidates_assigned,
      );
    });

    test("Render tables and alert assigned after drawing 1 lot", async () => {
      vi.spyOn(ReactRouter, "useParams").mockReturnValue({ listNumber: "2" });

      renderApportionmentListDetailsPage(11);

      expect(await screen.findByRole("heading", { level: 1, name: "Lijst 2 – GROEP 9" })).toBeVisible();

      expect(await screen.findByRole("heading", { level: 2, name: "Toegewezen aantal zetels" })).toBeVisible();
      expect(await screen.findByTestId("text-list-assigned-nr-seats")).toHaveTextContent(
        "Lijst 2 – GROEP 9 heeft 4 zetels toegewezen gekregen.",
      );

      expect(
        await screen.findByRole("heading", { level: 2, name: "Met voorkeursstemmen gekozen kandidaten" }),
      ).toBeVisible();
      expect(await screen.findByTestId("text-preferentially-chosen-candidates")).toHaveTextContent(
        "De volgende kandidaten zijn met voorkeursstemmen gekozen. Deze kandidaten hebben meer dan 50% van de kiesdeler gehaald.",
      );
      const alerts = await screen.findAllByRole("alert");
      expect(alerts).toHaveLength(1);
      if (alerts[0]) {
        expect(alerts[0]).toHaveClass(alertCls.notify!);
        expect(alerts[0]).toHaveTextContent(
          "Zetel 4 is na loting toegewezen aan Kandidaat 5 – De Vegt, F.W. (er is geloot tussen kandidaat 2, 4 en 5)",
        );
      }
      const preferentially_chosen_candidates_table = await screen.findByTestId(
        "preferentially-chosen-candidates-table",
      );
      expect(preferentially_chosen_candidates_table).toBeVisible();
      expect(preferentially_chosen_candidates_table).toHaveTableContent([
        ["Zetel", "Naam", "Woonplaats", "Aantal stemmen"],
        ["1", "Van Bekking, L.L. (x)", "Eemstricht", "500"],
        ["2", "Bruins-Van den Kerk, O. (v)", "Eemstricht", "450"],
        ["3", "Groenen, S. (v)", "Bloemstede", "400"],
        ["4", "De Vegt, F.W. (x)", "Eksterlo", "350"],
      ]);

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

      expect(
        await screen.findByRole("heading", { level: 2, name: "Rangschikking van kandidaten voor opvolging" }),
      ).toBeVisible();
      expect(await screen.findByTestId("text-ranking-candidates")).toHaveTextContent(
        "De volgende kandidaten hebben geen zetel toegewezen gekregen. Als een zetel vrijkomt wordt deze via de onderstaande volgorde aan opvolgers toegewezen.",
      );
      const candidates_ranking_table = await screen.findByTestId("candidates-ranking-table");
      expect(candidates_ranking_table).toBeVisible();
      expect(candidates_ranking_table).toHaveTableContent([
        ["Rang", "Naam", "Woonplaats", "Positie op lijst"],
        ["1", "Oorschot, W. (v)", "Eksterlo", "2"],
        ["2", "Van Bekking, W. (m)", "Juinen", "4"],
      ]);

      expect(
        await screen.findByRole("heading", { level: 2, name: "Totaal aantal stemmen per kandidaat" }),
      ).toBeVisible();
      const total_votes_per_candidate_table = await screen.findByTestId("total-votes-per-candidate-table");
      expect(total_votes_per_candidate_table).toBeVisible();
      expect(total_votes_per_candidate_table).toHaveTableContent([
        ["Nummer", "Kandidaat", "Woonplaats", "Aantal stemmen"],
        ["1", "Van Bekking, L.L. (x)", "Eemstricht", "500"],
        ["2", "Oorschot, W. (v)", "Eksterlo", "350"],
        ["3", "Groenen, S. (v)", "Bloemstede", "400"],
        ["4", "Van Bekking, W. (m)", "Juinen", "350"],
        ["5", "De Vegt, F.W. (x)", "Eksterlo", "350"],
        ["6", "Bruins-Van den Kerk, O. (v)", "Eemstricht", "450"],
      ]);
    });

    test("Render tables and alert assigned after drawing 2 lots", async () => {
      vi.spyOn(ReactRouter, "useParams").mockReturnValue({ listNumber: "1" });

      renderApportionmentListDetailsPage(11);

      expect(await screen.findByRole("heading", { level: 1, name: "Lijst 1 – GROEP 8" })).toBeVisible();

      expect(await screen.findByRole("heading", { level: 2, name: "Toegewezen aantal zetels" })).toBeVisible();
      expect(await screen.findByTestId("text-list-assigned-nr-seats")).toHaveTextContent(
        "Lijst 1 – GROEP 8 heeft 5 zetels toegewezen gekregen.",
      );

      expect(
        await screen.findByRole("heading", { level: 2, name: "Met voorkeursstemmen gekozen kandidaten" }),
      ).toBeVisible();
      expect(await screen.findByTestId("text-preferentially-chosen-candidates")).toHaveTextContent(
        "De volgende kandidaten zijn met voorkeursstemmen gekozen. Deze kandidaten hebben meer dan 50% van de kiesdeler gehaald.",
      );
      const alerts = await screen.findAllByRole("alert");
      expect(alerts).toHaveLength(1);
      if (alerts[0]) {
        expect(alerts[0]).toHaveClass(alertCls.notify!);
        expect(alerts[0]).toHaveTextContent(
          "Sommige zetels konden niet automatisch worden toegewezen en zijn via loting toegekend:",
        );
        expect(alerts[0]).toHaveTextContent(
          "Zetel 2 is toegewezen aan Kandidaat 6 – Arets, T.E. (Tiemen)(er is geloot tussen kandidaat 2 en 6)",
        );
        expect(alerts[0]).toHaveTextContent(
          "Zetel 4 is toegewezen aan Kandidaat 4 – Boermans, C.O.V. (Cornelus)(er is geloot tussen kandidaat 3 en 4)",
        );
      }
      const preferentially_chosen_candidates_table = await screen.findByTestId(
        "preferentially-chosen-candidates-table",
      );
      expect(preferentially_chosen_candidates_table).toBeVisible();
      expect(preferentially_chosen_candidates_table).toHaveTableContent([
        ["Zetel", "Naam", "Woonplaats", "Aantal stemmen"],
        ["1", "Van Bekking, J. (Jory) (m)", "Huisden", "600"],
        ["2", "Arets, T.E. (Tiemen) (v)", "'s Gravenveen", "550"],
        ["3", "Wiertz, K. (Kris) (m)", "Huisden", "550"],
        ["4", "Boermans, C.O.V. (Cornelus) (v)", "Bloemstede", "500"],
        ["5", "Van der Meulen, E.V.L.P. (Esra) (m)", "Middelgein", "500"],
      ]);

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

      expect(
        await screen.findByRole("heading", { level: 2, name: "Rangschikking van kandidaten voor opvolging" }),
      ).toBeVisible();
      expect(await screen.findByTestId("text-ranking-candidates")).toHaveTextContent(
        "De volgende kandidaten hebben geen zetel toegewezen gekregen. Als een zetel vrijkomt wordt deze via de onderstaande volgorde aan opvolgers toegewezen.",
      );
      const candidates_ranking_table = await screen.findByTestId("candidates-ranking-table");
      expect(candidates_ranking_table).toBeVisible();
      expect(candidates_ranking_table).toHaveTableContent([
        ["Rang", "Naam", "Woonplaats", "Positie op lijst"],
        ["1", "Gopal, S.S. (Sijtze) (v)", "'s Gravenveen", "5"],
      ]);

      expect(
        await screen.findByRole("heading", { level: 2, name: "Totaal aantal stemmen per kandidaat" }),
      ).toBeVisible();
      const total_votes_per_candidate_table = await screen.findByTestId("total-votes-per-candidate-table");
      expect(total_votes_per_candidate_table).toBeVisible();
      expect(total_votes_per_candidate_table).toHaveTableContent([
        ["Nummer", "Kandidaat", "Woonplaats", "Aantal stemmen"],
        ["1", "Van Bekking, J. (Jory) (m)", "Huisden", "600"],
        ["2", "Wiertz, K. (Kris) (m)", "Huisden", "550"],
        ["3", "Van der Meulen, E.V.L.P. (Esra) (m)", "Middelgein", "500"],
        ["4", "Boermans, C.O.V. (Cornelus) (v)", "Bloemstede", "500"],
        ["5", "Gopal, S.S. (Sijtze) (v)", "'s Gravenveen", "400"],
        ["6", "Arets, T.E. (Tiemen) (v)", "'s Gravenveen", "550"],
      ]);
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
      vi.spyOn(ReactRouter, "useParams").mockReturnValue({ listNumber: "1" });
      overrideOnce("post", "/api/elections/3/apportionment", 412, {
        error: "Committee session not completed",
        fatal: false,
        reference: "ApportionmentCommitteeSessionNotCompleted",
      } satisfies ErrorResponse);

      renderApportionmentListDetailsPage(3);

      // Wait for the page to be loaded
      expect(await screen.findByRole("heading", { level: 1, name: "Lijst 1 – Political Group A" })).toBeVisible();

      expect(await screen.findByText("Zetelverdeling is nog niet beschikbaar")).toBeVisible();
      expect(
        await screen.findByText("De zetelverdeling kan pas gemaakt worden als de zitting is afgerond"),
      ).toBeVisible();

      expect(screen.queryByTestId("preferentially-chosen-candidates-table")).not.toBeInTheDocument();
      expect(screen.queryByTestId("other-chosen-candidates-table")).not.toBeInTheDocument();
      expect(screen.queryByTestId("candidates-ranking-table")).not.toBeInTheDocument();
      expect(screen.queryByTestId("total-votes-per-candidate-table")).not.toBeInTheDocument();
    });

    test("Not possible because committee session is not completed yet", async () => {
      vi.spyOn(ReactRouter, "useParams").mockReturnValue({ listNumber: "1" });
      overrideOnce("post", "/api/elections/3/apportionment", 412, {
        error: "Committee session not completed",
        fatal: false,
        reference: "ApportionmentCommitteeSessionNotCompleted",
      } satisfies ErrorResponse);

      renderApportionmentListDetailsPage(3);

      // Wait for the page to be loaded
      expect(await screen.findByRole("heading", { level: 1, name: "Lijst 1 – Political Group A" })).toBeVisible();

      expect(await screen.findByText("Zetelverdeling is nog niet beschikbaar")).toBeVisible();
      expect(
        await screen.findByText("De zetelverdeling kan pas gemaakt worden als de zitting is afgerond"),
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

      overrideOnce("post", "/api/elections/3/apportionment", 500, {
        error: "Internal Server Error",
        fatal: true,
        reference: "InternalServerError",
      });

      await router.navigate("/elections/3/apportionment/1");

      rtlRender(<Providers router={router} />);

      await expectErrorPage();
    });
  });
});

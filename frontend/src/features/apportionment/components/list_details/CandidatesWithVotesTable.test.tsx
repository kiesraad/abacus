import { describe, expect, test } from "vitest";

import { render, screen } from "@/testing";

import {
  political_group_1,
  political_group_1_candidate_nomination,
  political_group_1_votes,
} from "../../testing/less-than-19-seats";
import { CandidatesWithVotesTable } from "./CandidatesWithVotesTable";

describe("CandidatesWithVotesTable", () => {
  test("renders a table with the candidates, localities and number of votes", async () => {
    render(
      <CandidatesWithVotesTable
        id="test-table"
        showNumber={false}
        showLocality={true}
        candidateList={political_group_1.candidates}
        candidateVotesList={political_group_1_candidate_nomination.preferential_candidate_nomination}
      />,
    );

    const table = await screen.findByRole("table");
    expect(table).toBeVisible();
    expect(table).toHaveTableContent([
      ["Kandidaat", "Woonplaats", "Aantal stemmen"],
      ["Kok, K. (Karin) (v)", "Test Location", "200"],
      ["Oud, L. (Lidewij) (v)", "Test Location", "138"],
      ["van der Weijden, B. (Berta) (v)", "Test Location", "100"],
      ["Oud, K. (Klaas) (m)", "Test Location", "60"],
      ["Oud, M. (Marijke) (v)", "Test Location", "55"],
      ["van der Weijden, H. (Henk) (m)", "Test Location", "50"],
      ["de Jong, R. (Rolf) (m)", "Test Location", "50"],
      ["Jansen, A. (Arie) (m)", "Test Location", "45"],
      ["Bakker, S. (Sophie) (v)", "Test Location", "40"],
    ]);
  });

  test("renders a table with the candidates, localities and number of votes", async () => {
    render(
      <CandidatesWithVotesTable
        id="test-table"
        showNumber={true}
        showLocality={false}
        candidateList={political_group_1.candidates}
        candidateVotesList={political_group_1_votes.candidate_votes}
      />,
    );

    const table = await screen.findByRole("table");
    expect(table).toBeVisible();
    expect(table).toHaveTableContent([
      ["Nummer", "Kandidaat", "Aantal stemmen"],
      ["1", "Oud, L. (Lidewij) (v)", "138"],
      ["2", "Oud, J. (Johan) (m)", "20"],
      ["3", "Oud, M. (Marijke) (v)", "55"],
      ["4", "Jansen, A. (Arie) (m)", "45"],
      ["5", "van der Weijden, H. (Henk) (m)", "50"],
      ["6", "van der Weijden, B. (Berta) (v)", "100"],
      ["7", "Oud, K. (Klaas) (m)", "60"],
      ["8", "Bakker, S. (Sophie) (v)", "40"],
      ["9", "de Vries, J. (Johan) (m)", "30"],
      ["10", "van den Berg, M. (Marijke) (v)", "20"],
      ["11", "de Jong, R. (Rolf) (m)", "50"],
      ["12", "Kok, K. (Karin) (v)", "200"],
    ]);
  });
});

import { describe, expect, test } from "vitest";

import { render, screen } from "@/testing";

import { political_group_1_candidate_nomination } from "../../testing/less-than-19-seats";
import { CandidatesRankingTable } from "./CandidatesRankingTable";

describe("CandidatesRankingTable", () => {
  test("renders a table with the candidates and localities", async () => {
    render(
      <CandidatesRankingTable candidateRanking={political_group_1_candidate_nomination.updated_candidate_ranking} />,
    );

    const table = await screen.findByRole("table");
    expect(table).toBeVisible();
    expect(table).toHaveTableContent([
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
  });
});

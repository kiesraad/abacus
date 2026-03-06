import type { StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import * as lt19Seats from "../../testing/lt-19-seats";
import { CandidatesRankingTable } from "./CandidatesRankingTable";

export const Default: StoryObj = {
  render: () => {
    return (
      <CandidatesRankingTable
        candidateRanking={lt19Seats.political_group_1_candidate_nomination.updated_candidate_ranking}
      />
    );
  },
  play: async ({ canvas }) => {
    const table = canvas.getByRole("table");
    await expect(table).toBeVisible();
    expect(table).toHaveTableContent([
      ["Rang", "Naam", "Woonplaats", "Positie op lijst"],
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
  },
};

export default {};

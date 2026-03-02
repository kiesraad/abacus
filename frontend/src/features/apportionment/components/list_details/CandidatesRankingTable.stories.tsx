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
  },
};

export default {};

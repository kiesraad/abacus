import type { StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import * as lt19Seats from "../../testing/lt-19-seats";
import { CandidatesWithSeatTable } from "./CandidatesWithSeatTable";

export const DefaultWithVotes: StoryObj = {
  render: () => {
    return (
      <CandidatesWithSeatTable
        id="test-table"
        showPosition={false}
        showVotes={true}
        candidateList={lt19Seats.political_group_1.candidates}
        candidateVotesList={lt19Seats.political_group_1_candidate_nomination.preferential_candidate_nomination}
      />
    );
  },
  play: async ({ canvas }) => {
    const table = canvas.getByRole("table");
    await expect(table).toBeVisible();
    expect(table).toHaveTableContent([
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
  },
};

export const DefaultWithPositionAndStartSeatNumber: StoryObj = {
  render: () => {
    return (
      <CandidatesWithSeatTable
        id="test-table"
        startSeatNumber={5}
        showPosition={true}
        showVotes={false}
        candidateList={lt19Seats.political_group_1.candidates}
        candidateVotesList={lt19Seats.political_group_1_candidate_nomination.preferential_candidate_nomination}
      />
    );
  },
  play: async ({ canvas }) => {
    const table = canvas.getByRole("table");
    await expect(table).toBeVisible();
    expect(table).toHaveTableContent([
      ["Zetel", "Naam", "Woonplaats", "Positie op de lijst"],
      ["5", "Kok, K. (Karin) (v)", "Test Location", "12"],
      ["6", "Oud, L. (Lidewij) (v)", "Test Location", "1"],
      ["7", "Van der Weijden, B. (Berta) (v)", "Test Location", "6"],
      ["8", "Oud, K. (Klaas) (m)", "Test Location", "7"],
      ["9", "Oud, M. (Marijke) (v)", "Test Location", "3"],
      ["10", "Van der Weijden, H. (Henk) (m)", "Test Location", "5"],
      ["11", "De Jong, R. (Rolf) (m)", "Test Location", "11"],
      ["12", "Jansen, A. (Arie) (m)", "Test Location", "4"],
      ["13", "Bakker, S. (Sophie) (v)", "Test Location", "8"],
    ]);
  },
};

export default {};

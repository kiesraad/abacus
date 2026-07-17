import type { StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import type { Candidate } from "@/types/generated/openapi";
import * as lt19Seats from "../../testing/lt-19-seats";
import { CandidatesWithVotesTable } from "./CandidatesWithVotesTable";

export const Default: StoryObj = {
  render: () => {
    return (
      <CandidatesWithVotesTable
        id="test-table"
        candidateList={lt19Seats.political_group_1.candidates}
        candidateVotesList={lt19Seats.political_group_1_candidate_nomination.preferential_candidate_nomination}
        deceasedCandidateNumbersList={[3]}
      />
    );
  },
  play: async ({ canvas }) => {
    const table = canvas.getByRole("table");
    await expect(table).toBeVisible();
    expect(table).toHaveTableContent([
      ["Nummer", "Kandidaat", "Woonplaats", "Aantal stemmen"],
      ["12", "Kok, K. (Karin) (v)", "Test Location", "200"],
      ["1", "Oud, L. (Lidewij) (v)", "Test Location", "138"],
      ["6", "Weijden, B. (Berta) van der (v)", "Test Location (BE)", "100"],
      ["7", "Oud, K. (Klaas) (m)", "Test Location", "60"],
      ["3", "Oud, M. (Marijke) (v) †", "Test Location", "55"],
      ["5", "Weijden, H. (Henk) van der (m)", "Test Location", "50"],
      ["11", "Jong, R. (Rolf) de (m)", "Test Location", "50"],
      ["4", "Jansen, A. (Arie) (m)", "Test Location", "45"],
      ["8", "Bakker, S. (Sophie) (v)", "Test Location", "40"],
    ]);
  },
};

export const LargeVoteCount: StoryObj = {
  render: () => {
    const candidateList: Candidate[] = [
      {
        number: 1,
        initials: "T.",
        first_name: "Test",
        last_name: "Test",
        locality: "Test Location",
        gender: "Female",
      },
    ];

    const candidateVotesList = [{ number: 1, votes: 1_234 }];

    return (
      <CandidatesWithVotesTable
        id="test-table"
        candidateList={candidateList}
        candidateVotesList={candidateVotesList}
        deceasedCandidateNumbersList={[]}
      />
    );
  },
  play: async ({ canvas }) => {
    const table = canvas.getByRole("table");
    await expect(table).toBeVisible();
    expect(table).toHaveTableContent([
      ["Nummer", "Kandidaat", "Woonplaats", "Aantal stemmen"],
      ["1", "Test, T. (Test) (v)", "Test Location", "1.234"],
    ]);
  },
};

export default {};

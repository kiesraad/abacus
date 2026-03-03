import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import * as lt19Seats from "../../testing/lt-19-seats";
import { CandidatesWithVotesTable } from "./CandidatesWithVotesTable";

type CandidatesWithVotesTableProps = {
  showNumber: boolean;
  showLocality: boolean;
};

export const Default: StoryObj<CandidatesWithVotesTableProps> = {
  render: ({ showNumber, showLocality }) => {
    return (
      <CandidatesWithVotesTable
        id="test-table"
        showNumber={showNumber}
        showLocality={showLocality}
        candidateList={lt19Seats.political_group_1.candidates}
        candidateVotesList={lt19Seats.political_group_1_candidate_nomination.preferential_candidate_nomination}
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
      ["6", "Van der Weijden, B. (Berta) (v)", "Test Location", "100"],
      ["7", "Oud, K. (Klaas) (m)", "Test Location", "60"],
      ["3", "Oud, M. (Marijke) (v)", "Test Location", "55"],
      ["5", "Van der Weijden, H. (Henk) (m)", "Test Location", "50"],
      ["11", "De Jong, R. (Rolf) (m)", "Test Location", "50"],
      ["4", "Jansen, A. (Arie) (m)", "Test Location", "45"],
      ["8", "Bakker, S. (Sophie) (v)", "Test Location", "40"],
    ]);
  },
};

export default {
  args: {
    showNumber: true,
    showLocality: true,
  },
  argTypes: {
    showNumber: {
      options: [true, false],
      control: { type: "radio" },
    },
    showLocality: {
      options: [true, false],
      control: { type: "radio" },
    },
  },
} satisfies Meta<CandidatesWithVotesTableProps>;

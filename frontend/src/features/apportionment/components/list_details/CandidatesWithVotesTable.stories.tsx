import type { Meta, StoryObj } from "@storybook/react-vite";
import * as lt19Seats from "../../testing/lt-19-seats";
import { CandidatesWithVotesTable } from "./CandidatesWithVotesTable";

type CandidatesWithVotesTableProps = {
  showNumber: boolean;
  showLocality: boolean;
};

export const Default: StoryObj<CandidatesWithVotesTableProps> = {
  render: ({ showNumber, showLocality }) => (
    <CandidatesWithVotesTable
      id="test-table"
      showNumber={showNumber}
      showLocality={showLocality}
      candidateList={lt19Seats.political_group_1.candidates}
      candidateVotesList={lt19Seats.political_group_1_candidate_nomination.preferential_candidate_nomination}
    />
  ),
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
} satisfies Meta;

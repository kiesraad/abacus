import type { Meta, StoryFn, StoryObj } from "@storybook/react-vite";

import * as gte19Seats from "../testing/gte-19-seats";
import * as lt19Seats from "../testing/lt-19-seats";
import { HighestAverageAssignmentStep } from "../utils/seat-change";
import { ApportionmentTable } from "./ApportionmentTable";
import { ChosenCandidatesTable } from "./ChosenCandidatesTable";
import { ElectionSummaryTable } from "./ElectionSummaryTable";
import { FullSeatsTable } from "./full_seats/FullSeatsTable";
import { ResidualSeatsCalculationTable } from "./full_seats/ResidualSeatsCalculationTable";
import { CandidatesRankingTable } from "./list_details/CandidatesRankingTable";
import { CandidatesWithVotesTable } from "./list_details/CandidatesWithVotesTable";
import { HighestAveragesTable } from "./residual_seats/HighestAveragesTable";
import { LargestRemaindersTable } from "./residual_seats/LargestRemaindersTable";
import { UniqueHighestAveragesTable } from "./residual_seats/UniqueHighestAveragesTable";

export const DefaultApportionmentTable: StoryFn = () => (
  <ApportionmentTable
    finalStanding={gte19Seats.seat_assignment.final_standing}
    politicalGroups={gte19Seats.election.political_groups}
    fullSeats={gte19Seats.seat_assignment.full_seats}
    residualSeats={gte19Seats.seat_assignment.residual_seats}
    seats={gte19Seats.seat_assignment.seats}
  />
);

export const DefaultChosenCandidatesTable: StoryFn = () => (
  <ChosenCandidatesTable chosenCandidates={gte19Seats.candidate_nomination.chosen_candidates} />
);

export const DefaultElectionSummaryTable: StoryFn = () => (
  <ElectionSummaryTable
    votesCounts={gte19Seats.election_summary.votes_counts}
    seats={gte19Seats.seat_assignment.seats}
    quota={gte19Seats.seat_assignment.quota}
    numberOfVoters={gte19Seats.election.number_of_voters}
    preferenceThreshold={gte19Seats.candidate_nomination.preference_threshold}
  />
);

export const DefaultFullSeatsTable: StoryFn = () => (
  <FullSeatsTable
    finalStanding={gte19Seats.seat_assignment.final_standing}
    politicalGroups={gte19Seats.election.political_groups}
    quota={gte19Seats.seat_assignment.quota}
    resultChanges={[]}
  />
);

export const DefaultResidualSeatsCalculationTable: StoryFn = () => (
  <ResidualSeatsCalculationTable
    seats={gte19Seats.seat_assignment.seats}
    fullSeats={gte19Seats.seat_assignment.full_seats}
    residualSeats={gte19Seats.seat_assignment.residual_seats}
  />
);

export const DefaultCandidatesRankingTable: StoryFn = () => (
  <CandidatesRankingTable
    candidateRanking={lt19Seats.political_group_1_candidate_nomination.updated_candidate_ranking}
  />
);

type CandidatesWithVotesTableProps = {
  showNumber: boolean;
  showLocality: boolean;
};

export const DefaultCandidatesWithVotesTable: StoryObj<CandidatesWithVotesTableProps> = {
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

export const DefaultHighestAveragesTable: StoryFn = () => (
  <HighestAveragesTable
    steps={gte19Seats.seat_assignment.steps as HighestAverageAssignmentStep[]}
    finalStanding={gte19Seats.seat_assignment.final_standing}
    politicalGroups={gte19Seats.election.political_groups}
    resultChanges={[]}
  />
);

export const DefaultLargestRemaindersTable: StoryFn = () => (
  <LargestRemaindersTable
    steps={lt19Seats.largest_remainder_steps}
    finalStanding={lt19Seats.seat_assignment.final_standing}
    politicalGroups={lt19Seats.election.political_groups}
    resultChanges={[]}
  />
);

export const DefaultUniqueHighestAveragesTable: StoryFn = () => (
  <UniqueHighestAveragesTable
    steps={lt19Seats.highest_average_steps}
    finalStanding={lt19Seats.seat_assignment.final_standing}
    politicalGroups={lt19Seats.election.political_groups}
  />
);

export default {
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

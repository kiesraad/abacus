import { Story } from "@ladle/react";

import { PoliticalGroup } from "@/api";

import * as gte19Seats from "../testing/19-or-more-seats";
import * as lt19Seats from "../testing/less-than-19-seats";
import { HighestAverageAssignmentStep } from "../utils/seat-change";
import { ApportionmentTable } from "./ApportionmentTable";
import { ChosenCandidatesTable } from "./ChosenCandidatesTable";
import { ElectionSummaryTable } from "./ElectionSummaryTable";
import { FullSeatsTable } from "./full_seats/FullSeatsTable";
import { ResidualSeatsCalculationTable } from "./full_seats/ResidualSeatsCalculationTable";
import { CandidatesRankingTable } from "./list_details/CandidatesRankingTable";
import { CandidatesWithVotesTable } from "./list_details/CandidatesWithVotesTable";
import { HighestAveragesFor19OrMoreSeatsTable } from "./residual_seats/HighestAveragesFor19OrMoreSeatsTable";
import { HighestAveragesForLessThan19SeatsTable } from "./residual_seats/HighestAveragesForLessThan19SeatsTable";
import { LargestRemaindersTable } from "./residual_seats/LargestRemaindersTable";

export default {
  title: "App / Apportionment",
};

export const DefaultApportionmentTable: Story = () => (
  <ApportionmentTable
    finalStanding={gte19Seats.seat_assignment.final_standing}
    politicalGroups={gte19Seats.election.political_groups as PoliticalGroup[]}
    fullSeats={gte19Seats.seat_assignment.full_seats}
    residualSeats={gte19Seats.seat_assignment.residual_seats}
    seats={gte19Seats.seat_assignment.seats}
  />
);
DefaultApportionmentTable.storyName = "ApportionmentTable";

export const DefaultChosenCandidatesTable: Story = () => (
  <ChosenCandidatesTable chosenCandidates={gte19Seats.candidate_nomination.chosen_candidates} />
);
DefaultChosenCandidatesTable.storyName = "ChosenCandidatesTable";

export const DefaultElectionSummaryTable: Story = () => (
  <ElectionSummaryTable
    votesCounts={gte19Seats.election_summary.votes_counts}
    seats={gte19Seats.seat_assignment.seats}
    quota={gte19Seats.seat_assignment.quota}
    numberOfVoters={gte19Seats.election.number_of_voters}
    preferenceThreshold={gte19Seats.candidate_nomination.preference_threshold}
  />
);
DefaultElectionSummaryTable.storyName = "ElectionSummaryTable";

export const DefaultFullSeatsTable: Story = () => (
  <FullSeatsTable
    finalStanding={gte19Seats.seat_assignment.final_standing}
    politicalGroups={gte19Seats.election.political_groups ?? []}
    quota={gte19Seats.seat_assignment.quota}
  />
);
DefaultFullSeatsTable.storyName = "FullSeatsTable";

export const DefaultResidualSeatsCalculationTable: Story = () => (
  <ResidualSeatsCalculationTable
    seats={gte19Seats.seat_assignment.seats}
    fullSeats={gte19Seats.seat_assignment.full_seats}
    residualSeats={gte19Seats.seat_assignment.residual_seats}
  />
);
DefaultResidualSeatsCalculationTable.storyName = "ResidualSeatsCalculationTable";

export const DefaultCandidatesRankingTable: Story = () => (
  <CandidatesRankingTable
    candidateRanking={lt19Seats.political_group_1_candidate_nomination.updated_candidate_ranking}
  />
);
DefaultCandidatesRankingTable.storyName = "CandidatesRankingTable";

type CandidatesWithVotesTableProps = {
  showNumber: boolean;
  showLocality: boolean;
};

export const DefaultCandidatesWithVotesTable: Story<CandidatesWithVotesTableProps> = ({ showNumber, showLocality }) => (
  <CandidatesWithVotesTable
    id="test-table"
    showNumber={showNumber}
    showLocality={showLocality}
    candidateList={lt19Seats.political_group_1.candidates}
    candidateVotesList={lt19Seats.political_group_1_candidate_nomination.preferential_candidate_nomination}
  />
);
DefaultCandidatesWithVotesTable.storyName = "CandidatesWithVotesTable";
DefaultCandidatesWithVotesTable.argTypes = {
  showNumber: {
    options: [true, false],
    control: { type: "radio" },
  },
  showLocality: {
    options: [true, false],
    control: { type: "radio" },
  },
};

export const DefaultLargestAveragesFor19OrMoreSeatsTable: Story = () => (
  <HighestAveragesFor19OrMoreSeatsTable
    steps={gte19Seats.seat_assignment.steps as HighestAverageAssignmentStep[]}
    finalStanding={gte19Seats.seat_assignment.final_standing}
    politicalGroups={gte19Seats.election.political_groups as PoliticalGroup[]}
  />
);
DefaultLargestAveragesFor19OrMoreSeatsTable.storyName = "Largest averages for 19 or more seats table";

export const DefaultLargestAveragesForLessThan19SeatsTable: Story = () => (
  <HighestAveragesForLessThan19SeatsTable
    steps={lt19Seats.highest_average_steps}
    finalStanding={lt19Seats.seat_assignment.final_standing}
    politicalGroups={lt19Seats.election.political_groups as PoliticalGroup[]}
  />
);
DefaultLargestAveragesForLessThan19SeatsTable.storyName = "Largest averages for less than 19 seats table";

export const DefaultLargestRemaindersTable: Story = () => (
  <LargestRemaindersTable
    steps={lt19Seats.largest_remainder_steps}
    finalStanding={lt19Seats.seat_assignment.final_standing}
    politicalGroups={lt19Seats.election.political_groups as PoliticalGroup[]}
  />
);
DefaultLargestRemaindersTable.storyName = "LargestRemaindersTable";

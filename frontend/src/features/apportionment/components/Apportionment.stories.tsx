import { Story } from "@ladle/react";

import { PoliticalGroup } from "@/api";

import * as equalOrMore from "../testing/19-or-more-seats";
import * as lessThan from "../testing/less-than-19-seats";
import { ApportionmentTable } from "./ApportionmentTable";
import { ElectionSummaryTable } from "./ElectionSummaryTable";
import { FullSeatsTable } from "./full_seats/FullSeatsTable";
import { ResidualSeatsCalculationTable } from "./full_seats/ResidualSeatsCalculationTable";
import { LargestAveragesFor19OrMoreSeatsTable } from "./residual_seats/LargestAveragesFor19OrMoreSeatsTable";
import { LargestAveragesForLessThan19SeatsTable } from "./residual_seats/LargestAveragesForLessThan19SeatsTable";
import { LargestRemaindersTable } from "./residual_seats/LargestRemaindersTable";

export default {
  title: "App / Apportionment",
};

export const DefaultApportionmentTable: Story = () => (
  <ApportionmentTable
    finalStanding={equalOrMore.seat_assignment.final_standing}
    politicalGroups={equalOrMore.election.political_groups as PoliticalGroup[]}
    fullSeats={equalOrMore.seat_assignment.full_seats}
    residualSeats={equalOrMore.seat_assignment.residual_seats}
    seats={equalOrMore.seat_assignment.seats}
  />
);
DefaultApportionmentTable.storyName = "ApportionmentTable";

export const DefaultElectionSummaryTable: Story = () => (
  <ElectionSummaryTable
    votesCounts={equalOrMore.election_summary.votes_counts}
    seats={equalOrMore.seat_assignment.seats}
    quota={equalOrMore.seat_assignment.quota}
    numberOfVoters={equalOrMore.election.number_of_voters}
  />
);
DefaultElectionSummaryTable.storyName = "ElectionSummaryTable";

export const DefaultLargestRemaindersTable: Story = () => (
  <LargestRemaindersTable
    largestRemainderSteps={lessThan.largest_remainder_steps}
    finalStanding={lessThan.seat_assignment.final_standing}
    politicalGroups={lessThan.election.political_groups as PoliticalGroup[]}
  />
);
DefaultLargestRemaindersTable.storyName = "LargestRemaindersTable";

export const DefaultLargestAveragesForLessThan19SeatsTable: Story = () => (
  <LargestAveragesForLessThan19SeatsTable
    largestAverageSteps={lessThan.largest_average_steps}
    finalStanding={lessThan.seat_assignment.final_standing}
    politicalGroups={lessThan.election.political_groups as PoliticalGroup[]}
  />
);
DefaultLargestAveragesForLessThan19SeatsTable.storyName = "Largest averages for less than 19 seats table";

export const DefaultLargestAveragesFor19OrMoreSeatsTable: Story = () => (
  <LargestAveragesFor19OrMoreSeatsTable
    largestAverageSteps={equalOrMore.seat_assignment.steps}
    finalStanding={equalOrMore.seat_assignment.final_standing}
    politicalGroups={equalOrMore.election.political_groups as PoliticalGroup[]}
  />
);
DefaultLargestAveragesFor19OrMoreSeatsTable.storyName = "Largest averages for 19 or more seats table";

export const DefaultResidualSeatsCalculationTable: Story = () => (
  <ResidualSeatsCalculationTable
    seats={equalOrMore.seat_assignment.seats}
    fullSeats={equalOrMore.seat_assignment.full_seats}
    residualSeats={equalOrMore.seat_assignment.residual_seats}
  />
);
DefaultResidualSeatsCalculationTable.storyName = "ResidualSeatsCalculationTable";

export const DefaultFullSeatsTable: Story = () => (
  <FullSeatsTable
    finalStanding={equalOrMore.seat_assignment.final_standing}
    politicalGroups={equalOrMore.election.political_groups ?? []}
    quota={equalOrMore.seat_assignment.quota}
  />
);
DefaultFullSeatsTable.storyName = "FullSeatsTable";

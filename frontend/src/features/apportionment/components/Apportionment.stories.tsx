import { Story } from "@ladle/react";

import { PoliticalGroup } from "@/api";
import { ElectionSummaryTable } from "@/features/apportionment/components/ElectionSummaryTable";
import { LargestAveragesFor19OrMoreSeatsTable } from "@/features/apportionment/components/residual_seats/LargestAveragesFor19OrMoreSeatsTable";
import { LargestAveragesForLessThan19SeatsTable } from "@/features/apportionment/components/residual_seats/LargestAveragesForLessThan19SeatsTable";
import { LargestRemaindersTable } from "@/features/apportionment/components/residual_seats/LargestRemaindersTable";
import { largest_average_steps, largest_remainder_steps } from "@/features/apportionment/testing/less-than-19-seats";

import { election, election_summary, seat_assignment } from "../testing/19-or-more-seats";
import { ApportionmentTable } from "./ApportionmentTable";

export default {
  title: "App / Apportionment",
};

export const DefaultApportionmentTable: Story = () => (
  <ApportionmentTable
    finalStanding={seat_assignment.final_standing}
    politicalGroups={election.political_groups as PoliticalGroup[]}
    fullSeats={seat_assignment.full_seats}
    residualSeats={seat_assignment.residual_seats}
    seats={seat_assignment.seats}
  />
);
DefaultApportionmentTable.storyName = "ApportionmentTable";

export const DefaultElectionSummaryTable: Story = () => (
  <ElectionSummaryTable
    votesCounts={election_summary.votes_counts}
    seats={seat_assignment.seats}
    quota={seat_assignment.quota}
    numberOfVoters={election.number_of_voters}
  />
);
DefaultElectionSummaryTable.storyName = "ElectionSummaryTable";

export const DefaultLargestRemaindersTable: Story = () => (
  <LargestRemaindersTable
    largestRemainderSteps={largest_remainder_steps}
    finalStanding={seat_assignment.final_standing}
    politicalGroups={election.political_groups as PoliticalGroup[]}
  />
);
DefaultLargestRemaindersTable.storyName = "LargestRemaindersTable";

export const DefaultLargestAveragesForLessThan19SeatsTable: Story = () => (
  <LargestAveragesForLessThan19SeatsTable
    largestAverageSteps={largest_average_steps}
    finalStanding={seat_assignment.final_standing}
    politicalGroups={election.political_groups as PoliticalGroup[]}
  />
);
DefaultLargestAveragesForLessThan19SeatsTable.storyName = "Largest averages for less than 19 seats table";

export const DefaultLargestAveragesFor19OrMoreSeatsTable: Story = () => (
  <LargestAveragesFor19OrMoreSeatsTable
    largestAverageSteps={seat_assignment.steps}
    finalStanding={seat_assignment.final_standing}
    politicalGroups={election.political_groups as PoliticalGroup[]}
  />
);
DefaultLargestAveragesFor19OrMoreSeatsTable.storyName = "Largest averages for 19 or more seats table";

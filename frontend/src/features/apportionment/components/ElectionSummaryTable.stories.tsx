import type { StoryFn } from "@storybook/react-vite";

import * as gte19Seats from "../testing/gte-19-seats";

import { ElectionSummaryTable } from "./ElectionSummaryTable";

export const Default: StoryFn = () => (
  <ElectionSummaryTable
    votesCounts={gte19Seats.election_summary.votes_counts}
    seats={gte19Seats.seat_assignment.seats}
    quota={gte19Seats.seat_assignment.quota}
    numberOfVoters={gte19Seats.election.number_of_voters}
    preferenceThreshold={gte19Seats.candidate_nomination.preference_threshold}
  />
);

export default {};

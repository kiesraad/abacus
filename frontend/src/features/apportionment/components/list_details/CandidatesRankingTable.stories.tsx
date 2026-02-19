import type { StoryFn } from "@storybook/react-vite";

import * as lt19Seats from "../../testing/lt-19-seats";

import { CandidatesRankingTable } from "./CandidatesRankingTable";

export const Default: StoryFn = () => (
  <CandidatesRankingTable
    candidateRanking={lt19Seats.political_group_1_candidate_nomination.updated_candidate_ranking}
  />
);

export default {};

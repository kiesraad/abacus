import { electionMockData } from "@/testing/api-mocks/ElectionMockData";
import type { Candidate, CandidateVotes, PollingStationResults } from "@/types/generated/openapi";

/**
 * Base candidate votes on given mock data to ensure there are the same number of candidates.
 * @param candidates List of candidates
 * @param votes Mapping of candidate number to votes
 * @returns List of CandidateVotes
 */
const baseCandidateVotesOn = (candidates: Candidate[] | undefined, votes: Record<number, number>): CandidateVotes[] => {
  // Get candidate numbers based on candidates or from the votes keys
  const candidateNumbers = candidates?.map((c) => c.number) ?? Object.keys(votes).map((k) => parseInt(k, 10));
  const expectedLength = Math.max(...candidateNumbers, 0);

  return Array.from({ length: expectedLength }, (_, i) => ({ number: i + 1, votes: votes[i + 1] ?? 0 }));
};

/**
 * Return PollingStationResults data for testing the resolve differences feature.
 * @param first true for the first entry, false for the second entry
 */
export function pollingStationResultsMockData(first: boolean): PollingStationResults {
  return {
    model: "CSOFirstSession",
    extra_investigation: {
      extra_investigation_other_reason: { yes: !first, no: first },
      ballots_recounted_extra_investigation: { yes: false, no: !first },
    },
    counting_differences_polling_station: {
      unexplained_difference_ballots_voters: { yes: false, no: false },
      difference_ballots_per_list: { yes: false, no: false },
    },
    voters_counts: {
      poll_card_count: 1514,
      proxy_certificate_count: 0,
      total_admitted_voters_count: 1514,
    },
    votes_counts: {
      political_group_total_votes: [
        { number: 1, total: first ? 1512 : 1481 },
        { number: 2, total: 2 },
      ],
      total_votes_candidates_count: first ? 1514 : 1483,
      blank_votes_count: 0,
      invalid_votes_count: 0,
      total_votes_cast_count: first ? 1514 : 1483,
    },
    differences_counts: {
      more_ballots_count: 0,
      fewer_ballots_count: 0,
      compare_votes_cast_admitted_voters: {
        admitted_voters_equal_votes_cast: false,
        votes_cast_greater_than_admitted_voters: false,
        votes_cast_smaller_than_admitted_voters: false,
      },
      difference_completely_accounted_for: { yes: false, no: false },
    },
    political_group_votes: [
      {
        number: 1,
        total: first ? 1512 : 1481,
        candidate_votes: baseCandidateVotesOn(electionMockData.political_groups[0]?.candidates, {
          1: first ? 1256 : 1258,
          2: 128,
          3: first ? 65 : 63,
          4: first ? 26 : 28,
          5: 4,
          6: 4,
          7: 3,
          8: 2,
          10: first ? 4 : 0,
          11: first ? 2 : 4,
        }),
      },
      {
        number: 2,
        total: 2,
        candidate_votes: baseCandidateVotesOn(electionMockData.political_groups[1]?.candidates, { 1: 2 }),
      },
    ],
  };
}

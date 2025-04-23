import { PollingStationResults } from "@/types/generated/openapi";

/**
 * Return PollingStationResults data for testing the resolve differences feature.
 * @param first true for the first entry, false for the second entry
 */
export function pollingStationResultsMockData(first: boolean): PollingStationResults {
  return {
    recounted: first,
    voters_counts: {
      poll_card_count: 42,
      proxy_certificate_count: 0,
      voter_card_count: 0,
      total_admitted_voters_count: 42,
    },
    votes_counts: {
      votes_candidates_count: first ? 42 : 44,
      blank_votes_count: 0,
      invalid_votes_count: 0,
      total_votes_cast_count: first ? 42 : 44,
    },
    voters_recounts: first
      ? {
          poll_card_count: 43,
          proxy_certificate_count: 1,
          voter_card_count: 0,
          total_admitted_voters_count: 44,
        }
      : undefined,
    differences_counts: {
      more_ballots_count: 0,
      fewer_ballots_count: 0,
      unreturned_ballots_count: 0,
      too_few_ballots_handed_out_count: 0,
      too_many_ballots_handed_out_count: 0,
      other_explanation_count: 0,
      no_explanation_count: 0,
    },
    political_group_votes: [
      {
        number: 1,
        total: first ? 512 : 481,
        candidate_votes: [
          { number: 1, votes: 256 },
          { number: 2, votes: 128 },
          { number: 3, votes: first ? 65 : 63 },
          { number: 4, votes: first ? 26 : 28 },
          { number: 3, votes: 10 },
          { number: 4, votes: 8 },
          { number: 5, votes: 4 },
          { number: 6, votes: 4 },
          { number: 7, votes: 3 },
          { number: 8, votes: 2 },
          { number: 9, votes: 0 },
          { number: 10, votes: first ? 4 : 0 },
          { number: 11, votes: first ? 2 : 4 },
          { number: 12, votes: first ? 0 : 2 },
        ],
      },
      {
        number: 2,
        total: 2,
        candidate_votes: [
          { number: 1, votes: 2 },
          { number: 2, votes: 0 },
        ],
      },
    ],
  };
}

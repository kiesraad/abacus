import { PollingStationResults } from "@/types/generated/openapi";

/**
 * Return PollingStationResults data for testing the resolve differences feature.
 * @param first true for the first entry, false for the second entry
 */
export function pollingStationResultsMockData(first: boolean): PollingStationResults {
  return {
    extra_investigation: {
      extra_investigation_other_reason: { yes: !first, no: first },
      ballots_recounted_extra_investigation: { yes: false, no: !first },
    },
    counting_differences_polling_station: {
      unexplained_difference_ballots_voters: { yes: false, no: false },
      difference_ballots_per_list: { yes: false, no: false },
    },
    voters_counts: {
      poll_card_count: 42,
      proxy_certificate_count: 0,
      total_admitted_voters_count: 42,
    },
    votes_counts: {
      votes_candidates_count: first ? 42 : 44,
      blank_votes_count: 0,
      invalid_votes_count: 0,
      total_votes_cast_count: first ? 42 : 44,
    },
    differences_counts: {
      more_ballots_count: 0,
      fewer_ballots_count: 0,
      admitted_voters_equals_votes_cast: false,
      votes_cast_greater_than_admitted_voters: false,
      votes_cast_smaller_than_admitted_voters: false,
      difference_completely_accounted_for: { yes: false, no: false },
    },
    political_group_votes: [
      {
        number: 1,
        total: first ? 1512 : 1481,
        candidate_votes: [
          { number: 1, votes: first ? 1256 : 1258 },
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
          { number: 12, votes: 0 },
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

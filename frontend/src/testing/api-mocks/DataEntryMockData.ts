import type {
  ClaimDataEntryResponse,
  DataEntryStatus,
  PollingStationResults,
  SaveDataEntryResponse,
  ValidationResults,
} from "@/api/gen/openapi";

import { electionMockData } from "./ElectionMockData";

export const emptyValidationResults: ValidationResults = {
  errors: [],
  warnings: [],
};

export const emptyData: PollingStationResults = {
  voters_counts: {
    poll_card_count: 0,
    proxy_certificate_count: 0,
    voter_card_count: 0,
    total_admitted_voters_count: 0,
  },
  votes_counts: {
    votes_candidates_count: 0,
    blank_votes_count: 0,
    invalid_votes_count: 0,
    total_votes_cast_count: 0,
  },
  differences_counts: {
    more_ballots_count: 0,
    fewer_ballots_count: 0,
    unreturned_ballots_count: 0,
    too_few_ballots_handed_out_count: 0,
    too_many_ballots_handed_out_count: 0,
    other_explanation_count: 0,
    no_explanation_count: 0,
  },
  political_group_votes: electionMockData.political_groups.map((group) => ({
    number: group.number,
    total: 0,
    candidate_votes: group.candidates.map((candidate) => ({
      number: candidate.number,
      votes: 0,
    })),
  })),
};

export const claimDataEntryResponse: ClaimDataEntryResponse = {
  data: emptyData,
  validation_results: emptyValidationResults,
  client_state: null,
};

export const saveDataEntryResponse: SaveDataEntryResponse = {
  validation_results: emptyValidationResults,
};

export const dataEntryStatusDifferences: DataEntryStatus = {
  status: "EntriesDifferent",
  state: {
    first_entry_user_id: 3,
    second_entry_user_id: 4,
    first_entry: {
      recounted: false,
      voters_counts: {
        poll_card_count: 10,
        proxy_certificate_count: 0,
        voter_card_count: 0,
        total_admitted_voters_count: 10,
      },
      votes_counts: {
        votes_candidates_count: 9,
        blank_votes_count: 1,
        invalid_votes_count: 0,
        total_votes_cast_count: 10,
      },
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
          total: 0,
          candidate_votes: [
            {
              number: 1,
              votes: 0,
            },
            {
              number: 2,
              votes: 0,
            },
            {
              number: 3,
              votes: 0,
            },
            {
              number: 4,
              votes: 0,
            },
            {
              number: 5,
              votes: 0,
            },
            {
              number: 6,
              votes: 0,
            },
            {
              number: 7,
              votes: 0,
            },
            {
              number: 8,
              votes: 0,
            },
          ],
        },
        {
          number: 2,
          total: 0,
          candidate_votes: [
            {
              number: 1,
              votes: 0,
            },
            {
              number: 2,
              votes: 0,
            },
            {
              number: 3,
              votes: 0,
            },
            {
              number: 4,
              votes: 0,
            },
            {
              number: 5,
              votes: 0,
            },
            {
              number: 6,
              votes: 0,
            },
          ],
        },
        {
          number: 3,
          total: 9,
          candidate_votes: [
            {
              number: 1,
              votes: 1,
            },
            {
              number: 2,
              votes: 1,
            },
            {
              number: 3,
              votes: 1,
            },
            {
              number: 4,
              votes: 1,
            },
            {
              number: 5,
              votes: 1,
            },
            {
              number: 6,
              votes: 1,
            },
            {
              number: 7,
              votes: 1,
            },
            {
              number: 8,
              votes: 1,
            },
            {
              number: 9,
              votes: 1,
            },
            {
              number: 10,
              votes: 0,
            },
            {
              number: 11,
              votes: 0,
            },
            {
              number: 12,
              votes: 0,
            },
            {
              number: 13,
              votes: 0,
            },
            {
              number: 14,
              votes: 0,
            },
            {
              number: 15,
              votes: 0,
            },
            {
              number: 16,
              votes: 0,
            },
            {
              number: 17,
              votes: 0,
            },
            {
              number: 18,
              votes: 0,
            },
            {
              number: 19,
              votes: 0,
            },
            {
              number: 20,
              votes: 0,
            },
            {
              number: 21,
              votes: 0,
            },
            {
              number: 22,
              votes: 0,
            },
            {
              number: 23,
              votes: 0,
            },
            {
              number: 24,
              votes: 0,
            },
            {
              number: 25,
              votes: 0,
            },
            {
              number: 26,
              votes: 0,
            },
            {
              number: 27,
              votes: 0,
            },
            {
              number: 28,
              votes: 0,
            },
            {
              number: 29,
              votes: 0,
            },
            {
              number: 30,
              votes: 0,
            },
          ],
        },
        {
          number: 4,
          total: 0,
          candidate_votes: [
            {
              number: 1,
              votes: 0,
            },
            {
              number: 2,
              votes: 0,
            },
            {
              number: 3,
              votes: 0,
            },
            {
              number: 4,
              votes: 0,
            },
            {
              number: 5,
              votes: 0,
            },
            {
              number: 6,
              votes: 0,
            },
            {
              number: 7,
              votes: 0,
            },
            {
              number: 8,
              votes: 0,
            },
            {
              number: 9,
              votes: 0,
            },
            {
              number: 10,
              votes: 0,
            },
            {
              number: 11,
              votes: 0,
            },
            {
              number: 12,
              votes: 0,
            },
            {
              number: 13,
              votes: 0,
            },
            {
              number: 14,
              votes: 0,
            },
            {
              number: 15,
              votes: 0,
            },
            {
              number: 16,
              votes: 0,
            },
            {
              number: 17,
              votes: 0,
            },
            {
              number: 18,
              votes: 0,
            },
            {
              number: 19,
              votes: 0,
            },
            {
              number: 20,
              votes: 0,
            },
            {
              number: 21,
              votes: 0,
            },
            {
              number: 22,
              votes: 0,
            },
            {
              number: 23,
              votes: 0,
            },
            {
              number: 24,
              votes: 0,
            },
            {
              number: 25,
              votes: 0,
            },
            {
              number: 26,
              votes: 0,
            },
            {
              number: 27,
              votes: 0,
            },
            {
              number: 28,
              votes: 0,
            },
            {
              number: 29,
              votes: 0,
            },
            {
              number: 30,
              votes: 0,
            },
            {
              number: 31,
              votes: 0,
            },
            {
              number: 32,
              votes: 0,
            },
            {
              number: 33,
              votes: 0,
            },
            {
              number: 34,
              votes: 0,
            },
            {
              number: 35,
              votes: 0,
            },
            {
              number: 36,
              votes: 0,
            },
            {
              number: 37,
              votes: 0,
            },
            {
              number: 38,
              votes: 0,
            },
            {
              number: 39,
              votes: 0,
            },
            {
              number: 40,
              votes: 0,
            },
            {
              number: 41,
              votes: 0,
            },
            {
              number: 42,
              votes: 0,
            },
            {
              number: 43,
              votes: 0,
            },
            {
              number: 44,
              votes: 0,
            },
            {
              number: 45,
              votes: 0,
            },
            {
              number: 46,
              votes: 0,
            },
            {
              number: 47,
              votes: 0,
            },
            {
              number: 48,
              votes: 0,
            },
            {
              number: 49,
              votes: 0,
            },
            {
              number: 50,
              votes: 0,
            },
          ],
        },
      ],
    },
    second_entry: {
      recounted: false,
      voters_counts: {
        poll_card_count: 10,
        proxy_certificate_count: 0,
        voter_card_count: 0,
        total_admitted_voters_count: 10,
      },
      votes_counts: {
        votes_candidates_count: 9,
        blank_votes_count: 1,
        invalid_votes_count: 0,
        total_votes_cast_count: 10,
      },
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
          total: 0,
          candidate_votes: [
            {
              number: 1,
              votes: 0,
            },
            {
              number: 2,
              votes: 0,
            },
            {
              number: 3,
              votes: 0,
            },
            {
              number: 4,
              votes: 0,
            },
            {
              number: 5,
              votes: 0,
            },
            {
              number: 6,
              votes: 0,
            },
            {
              number: 7,
              votes: 0,
            },
            {
              number: 8,
              votes: 0,
            },
          ],
        },
        {
          number: 2,
          total: 0,
          candidate_votes: [
            {
              number: 1,
              votes: 0,
            },
            {
              number: 2,
              votes: 0,
            },
            {
              number: 3,
              votes: 0,
            },
            {
              number: 4,
              votes: 0,
            },
            {
              number: 5,
              votes: 0,
            },
            {
              number: 6,
              votes: 0,
            },
          ],
        },
        {
          number: 3,
          total: 0,
          candidate_votes: [
            {
              number: 1,
              votes: 0,
            },
            {
              number: 2,
              votes: 0,
            },
            {
              number: 3,
              votes: 0,
            },
            {
              number: 4,
              votes: 0,
            },
            {
              number: 5,
              votes: 0,
            },
            {
              number: 6,
              votes: 0,
            },
            {
              number: 7,
              votes: 0,
            },
            {
              number: 8,
              votes: 0,
            },
            {
              number: 9,
              votes: 0,
            },
            {
              number: 10,
              votes: 0,
            },
            {
              number: 11,
              votes: 0,
            },
            {
              number: 12,
              votes: 0,
            },
            {
              number: 13,
              votes: 0,
            },
            {
              number: 14,
              votes: 0,
            },
            {
              number: 15,
              votes: 0,
            },
            {
              number: 16,
              votes: 0,
            },
            {
              number: 17,
              votes: 0,
            },
            {
              number: 18,
              votes: 0,
            },
            {
              number: 19,
              votes: 0,
            },
            {
              number: 20,
              votes: 0,
            },
            {
              number: 21,
              votes: 0,
            },
            {
              number: 22,
              votes: 0,
            },
            {
              number: 23,
              votes: 0,
            },
            {
              number: 24,
              votes: 0,
            },
            {
              number: 25,
              votes: 0,
            },
            {
              number: 26,
              votes: 0,
            },
            {
              number: 27,
              votes: 0,
            },
            {
              number: 28,
              votes: 0,
            },
            {
              number: 29,
              votes: 0,
            },
            {
              number: 30,
              votes: 0,
            },
          ],
        },
        {
          number: 4,
          total: 9,
          candidate_votes: [
            {
              number: 1,
              votes: 1,
            },
            {
              number: 2,
              votes: 1,
            },
            {
              number: 3,
              votes: 1,
            },
            {
              number: 4,
              votes: 1,
            },
            {
              number: 5,
              votes: 1,
            },
            {
              number: 6,
              votes: 1,
            },
            {
              number: 7,
              votes: 1,
            },
            {
              number: 8,
              votes: 1,
            },
            {
              number: 9,
              votes: 1,
            },
            {
              number: 10,
              votes: 0,
            },
            {
              number: 11,
              votes: 0,
            },
            {
              number: 12,
              votes: 0,
            },
            {
              number: 13,
              votes: 0,
            },
            {
              number: 14,
              votes: 0,
            },
            {
              number: 15,
              votes: 0,
            },
            {
              number: 16,
              votes: 0,
            },
            {
              number: 17,
              votes: 0,
            },
            {
              number: 18,
              votes: 0,
            },
            {
              number: 19,
              votes: 0,
            },
            {
              number: 20,
              votes: 0,
            },
            {
              number: 21,
              votes: 0,
            },
            {
              number: 22,
              votes: 0,
            },
            {
              number: 23,
              votes: 0,
            },
            {
              number: 24,
              votes: 0,
            },
            {
              number: 25,
              votes: 0,
            },
            {
              number: 26,
              votes: 0,
            },
            {
              number: 27,
              votes: 0,
            },
            {
              number: 28,
              votes: 0,
            },
            {
              number: 29,
              votes: 0,
            },
            {
              number: 30,
              votes: 0,
            },
            {
              number: 31,
              votes: 0,
            },
            {
              number: 32,
              votes: 0,
            },
            {
              number: 33,
              votes: 0,
            },
            {
              number: 34,
              votes: 0,
            },
            {
              number: 35,
              votes: 0,
            },
            {
              number: 36,
              votes: 0,
            },
            {
              number: 37,
              votes: 0,
            },
            {
              number: 38,
              votes: 0,
            },
            {
              number: 39,
              votes: 0,
            },
            {
              number: 40,
              votes: 0,
            },
            {
              number: 41,
              votes: 0,
            },
            {
              number: 42,
              votes: 0,
            },
            {
              number: 43,
              votes: 0,
            },
            {
              number: 44,
              votes: 0,
            },
            {
              number: 45,
              votes: 0,
            },
            {
              number: 46,
              votes: 0,
            },
            {
              number: 47,
              votes: 0,
            },
            {
              number: 48,
              votes: 0,
            },
            {
              number: 49,
              votes: 0,
            },
            {
              number: 50,
              votes: 0,
            },
          ],
        },
      ],
    },
    first_entry_finished_at: "2025-04-14T17:17:27.536338155Z",
    second_entry_finished_at: "2025-04-14T17:18:45.433270353Z",
  },
};

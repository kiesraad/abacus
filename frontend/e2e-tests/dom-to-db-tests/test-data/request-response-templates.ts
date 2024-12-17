import { GetDataEntryResponse, SaveDataEntryRequest, SaveDataEntryResponse } from "@kiesraad/api";

export const emptyDataEntryResponse: GetDataEntryResponse = {
  progress: 0,
  data: {
    recounted: false,
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
        ],
      },
    ],
  },
  validation_results: {
    errors: [],
    warnings: [],
  },
  client_state: {},
  updated_at: Number(Date.now() / 1000),
};

export const noRecountNoDifferencesRequest: Record<string, unknown> = {
  progress: 80,
  data: {
    recounted: false,
    voters_counts: {
      poll_card_count: 1000,
      proxy_certificate_count: 50,
      voter_card_count: 75,
      total_admitted_voters_count: 1125,
    },
    votes_counts: {
      votes_candidates_count: 1090,
      blank_votes_count: 20,
      invalid_votes_count: 15,
      total_votes_cast_count: 1125,
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
        total: 1090,
        candidate_votes: [
          {
            number: 1,
            votes: 837,
          },
          {
            number: 2,
            votes: 253,
          },
        ],
      },
    ],
  },
  client_state: {
    furthest: "political_group_votes_1",
    current: "political_group_votes_1",
    acceptedWarnings: [],
    continue: true,
  },
} satisfies SaveDataEntryRequest;

export const noErrorsWarningsResponse: Record<string, unknown> = {
  validation_results: {
    errors: [],
    warnings: [],
  },
} satisfies SaveDataEntryResponse;

import { getEmptyDataEntryRequest } from "@/features/data_entry/testing/mock-data";
import {
  ClaimDataEntryResponse,
  DataEntryGetDifferencesResponse,
  DataEntryGetErrorsResponse,
  PollingStationResults,
  SaveDataEntryResponse,
  ValidationResults,
} from "@/types/generated/openapi";

import { electionMockData, politicalGroupMockData } from "./ElectionMockData";
import { validationResultMockData } from "./ValidationResultMockData";

export const emptyValidationResults: ValidationResults = {
  errors: [],
  warnings: [],
};

export const emptyData: PollingStationResults = {
  voters_counts: {
    poll_card_count: 0,
    proxy_certificate_count: 0,
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
  extra_investigation: {
    extra_investigation_other_reason: {
      yes: false,
      no: false,
    },
    ballots_recounted_extra_investigation: {
      yes: false,
      no: false,
    },
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

export const dataEntryStatusDifferences: DataEntryGetDifferencesResponse = {
  first_entry_user_id: 3,
  second_entry_user_id: 4,
  first_entry: {
    voters_counts: {
      poll_card_count: 2,
      proxy_certificate_count: 0,
      total_admitted_voters_count: 2,
    },
    votes_counts: {
      votes_candidates_count: 2,
      blank_votes_count: 0,
      invalid_votes_count: 0,
      total_votes_cast_count: 2,
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
    extra_investigation: {
      extra_investigation_other_reason: {
        yes: false,
        no: false,
      },
      ballots_recounted_extra_investigation: {
        yes: false,
        no: false,
      },
    },
    political_group_votes: [
      {
        number: 1,
        total: 0,
        candidate_votes: politicalGroupMockData.candidates.map((c) => ({
          number: c.number,
          votes: 0,
        })),
      },
      {
        number: 2,
        total: 2,
        candidate_votes: [
          {
            number: 1,
            votes: 2,
          },
          {
            number: 2,
            votes: 0,
          },
        ],
      },
    ],
  },
  second_entry: {
    voters_counts: {
      poll_card_count: 2,
      proxy_certificate_count: 0,
      total_admitted_voters_count: 2,
    },
    votes_counts: {
      votes_candidates_count: 2,
      blank_votes_count: 0,
      invalid_votes_count: 0,
      total_votes_cast_count: 2,
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
    extra_investigation: {
      extra_investigation_other_reason: {
        yes: false,
        no: false,
      },
      ballots_recounted_extra_investigation: {
        yes: false,
        no: false,
      },
    },
    political_group_votes: [
      {
        number: 1,
        total: 0,
        candidate_votes: politicalGroupMockData.candidates.map((c) => ({
          number: c.number,
          votes: 0,
        })),
      },
      {
        number: 2,
        total: 2,
        candidate_votes: [
          {
            number: 1,
            votes: 0,
          },
          {
            number: 2,
            votes: 2,
          },
        ],
      },
    ],
  },
};

export const dataEntryGetErrorsMockResponse: DataEntryGetErrorsResponse = {
  finalised_first_entry: getEmptyDataEntryRequest().data,
  first_entry_finished_at: "",
  first_entry_user_id: 3,
  validation_results: {
    errors: [validationResultMockData.F201],
    warnings: [validationResultMockData.W001, validationResultMockData.W201, validationResultMockData.W301],
  },
};

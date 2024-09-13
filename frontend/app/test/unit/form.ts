import { FormState, POLLING_STATION_DATA_ENTRY_REQUEST_BODY } from "@kiesraad/api";
import { electionMockData } from "@kiesraad/api-mocks";

export const emptyDataEntryRequest: POLLING_STATION_DATA_ENTRY_REQUEST_BODY = {
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
    political_group_votes: electionMockData.political_groups.map((group) => ({
      number: group.number,
      total: 0,
      candidate_votes: group.candidates.map((candidate) => ({
        number: candidate.number,
        votes: 0,
      })),
    })),
  },
};

export const defaultFormState: FormState = {
  active: "recounted",
  current: "recounted",
  sections: {
    recounted: {
      index: 0,
      id: "recounted",
      isSaved: false,
      ignoreWarnings: false,
      errors: [],
      warnings: [],
    },
    voters_votes_counts: {
      index: 1,
      id: "voters_votes_counts",
      isSaved: false,
      ignoreWarnings: false,
      errors: [],
      warnings: [],
    },
    differences_counts: {
      index: 2,
      id: "differences_counts",
      isSaved: false,
      ignoreWarnings: false,
      errors: [],
      warnings: [],
    },
    political_group_votes_1: {
      index: 3,
      id: "political_group_votes_1",
      isSaved: false,
      ignoreWarnings: false,
      errors: [],
      warnings: [],
    },
    political_group_votes_2: {
      index: 4,
      id: "political_group_votes_2",
      isSaved: false,
      ignoreWarnings: false,
      errors: [],
      warnings: [],
    },
    save: {
      index: 5,
      id: "save",
      isSaved: false,
      ignoreWarnings: false,
      errors: [],
      warnings: [],
    },
  },
  unknown: {
    errors: [],
    warnings: [],
  },
  isCompleted: false,
};

import {
  POLLING_STATION_DATA_ENTRY_SAVE_REQUEST_BODY,
  PollingStationResults,
  ValidationResult,
  ValidationResultCode,
} from "@kiesraad/api";
import { electionMockData } from "@kiesraad/api-mocks";

import { DataEntryState, FormSection } from "../state/types";

export function getInitialValues(): PollingStationResults {
  return {
    recounted: undefined,
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
    voters_recounts: undefined,
    differences_counts: {
      more_ballots_count: 0,
      fewer_ballots_count: 0,
      unreturned_ballots_count: 0,
      too_few_ballots_handed_out_count: 0,
      too_many_ballots_handed_out_count: 0,
      other_explanation_count: 0,
      no_explanation_count: 0,
    },
    political_group_votes: electionMockData.political_groups.map((pg) => ({
      number: pg.number,
      total: 0,
      candidate_votes: pg.candidates.map((c) => ({
        number: c.number,
        votes: 0,
      })),
    })),
  };
}

export function getDefaultFormSection(): Omit<FormSection, "id" | "index"> {
  return {
    title: "Toegelaten kiezers en uitgebrachte stemmen",
    isSaved: false,
    acceptWarnings: false,
    hasChanges: false,
    acceptWarningsError: false,
    errors: [],
    warnings: [],
  };
}

export function getDefaultDataEntryState(): DataEntryState {
  const defaultFormSection = getDefaultFormSection();
  return {
    election: electionMockData,
    pollingStationId: 1,
    error: null,
    pollingStationResults: null,
    entryNumber: 1,
    formState: {
      current: "recounted",
      furthest: "recounted",
      sections: {
        recounted: {
          id: "recounted",
          index: 1,
          ...defaultFormSection,
        },
        voters_votes_counts: {
          id: "voters_votes_counts",
          index: 2,
          ...defaultFormSection,
        },
        differences_counts: {
          id: "differences_counts",
          index: 3,
          ...defaultFormSection,
        },
        political_group_votes_1: {
          id: "political_group_votes_1",
          index: 4,
          ...defaultFormSection,
        },
        save: {
          id: "save",
          index: 5,
          ...defaultFormSection,
        },
      },
    },
    targetFormSectionId: "recounted",
    status: "idle",
    cache: null,
  };
}

export function getEmptyDataEntryRequest(): POLLING_STATION_DATA_ENTRY_SAVE_REQUEST_BODY {
  return {
    progress: 0,
    data: {
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
    client_state: {
      test: "test",
    },
  };
}

type ErrorWarningsMap<Code extends ValidationResultCode> = {
  [C in Code]: ValidationResult & { code: C };
};

export const errorWarningMocks: ErrorWarningsMap<"F101" | "F201" | "F301" | "F204" | "W301" | "W302"> = {
  F101: {
    fields: ["data.recounted"],
    code: "F101",
  },
  F201: {
    fields: [
      "data.voters_counts.poll_card_count",
      "data.voters_counts.proxy_certificate_count",
      "data.voters_counts.voter_card_count",
      "data.voters_counts.total_admitted_voters_count",
    ],
    code: "F201",
  },
  F204: {
    fields: ["data.votes_counts.votes_candidates_count", "data.political_group_votes"],
    code: "F204",
  },
  F301: {
    fields: ["data.differences_counts.more_ballots_count"],
    code: "F301",
  },
  W301: {
    fields: [
      "data.differences_counts.more_ballots_count",
      "data.differences_counts.too_many_ballots_handed_out_count",
      "data.differences_counts.unreturned_ballots_count",
      "data.differences_counts.too_few_ballots_handed_out_count",
      "data.differences_counts.other_explanation_count",
      "data.differences_counts.no_explanation_count",
    ],
    code: "W301",
  },
  W302: {
    fields: [
      "data.differences_counts.fewer_ballots_count",
      "data.differences_counts.unreturned_ballots_count",
      "data.differences_counts.too_few_ballots_handed_out_count",
      "data.differences_counts.too_many_ballots_handed_out_count",
      "data.differences_counts.other_explanation_count",
      "data.differences_counts.no_explanation_count",
    ],
    code: "W302",
  },
};

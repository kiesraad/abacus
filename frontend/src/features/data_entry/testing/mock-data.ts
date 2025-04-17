import { electionMockData } from "@/testing/api-mocks/ElectionMockData";
import {
  POLLING_STATION_DATA_ENTRY_SAVE_REQUEST_BODY,
  PollingStationResults,
  ValidationResult,
  ValidationResultCode,
} from "@/types/generated/openapi";
import { FormSectionId } from "@/types/types";

import { DataEntryState, FormSection } from "../types/types";
import { ValidationResultSet } from "../utils/ValidationResults";

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

export function getDefaultFormSection(id: FormSectionId, index: number): FormSection {
  return {
    id,
    index,
    title: "Toegelaten kiezers en uitgebrachte stemmen",
    isSaved: false,
    acceptWarnings: false,
    hasChanges: false,
    acceptWarningsError: false,
    errors: new ValidationResultSet(),
    warnings: new ValidationResultSet(),
  };
}

export function getDefaultDataEntryState(): DataEntryState {
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
        recounted: getDefaultFormSection("recounted", 1),
        voters_votes_counts: getDefaultFormSection("voters_votes_counts", 2),
        differences_counts: getDefaultFormSection("differences_counts", 3),
        political_group_votes_1: getDefaultFormSection("political_group_votes_1", 4),
        save: getDefaultFormSection("save", 5),
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

export const errorWarningMocks: ErrorWarningsMap<ValidationResultCode> = {
  F101: { fields: ["data.recounted"], code: "F101" },
  F201: {
    fields: [
      "data.voters_counts.poll_card_count",
      "data.voters_counts.proxy_certificate_count",
      "data.voters_counts.voter_card_count",
      "data.voters_counts.total_admitted_voters_count",
    ],
    code: "F201",
  },
  F202: {
    fields: [
      "data.votes_counts.total_votes_cast_count",
      "data.votes_counts.votes_candidates_count",
      "data.votes_counts.blank_votes_count",
      "data.votes_counts.invalid_votes_count",
    ],
    code: "F202",
  },
  F203: {
    fields: [
      "data.voters_recounts.total_admitted_voters_count",
      "data.voters_recounts.poll_card_count",
      "data.voters_recounts.proxy_certificate_count",
      "data.voters_recounts.voter_card_count",
    ],
    code: "F203",
  },
  F204: {
    fields: ["data.votes_counts.votes_candidates_count", "data.political_group_votes[0].total"],
    code: "F204",
  },
  F301: { fields: ["data.differences_counts.more_ballots_count"], code: "F301" },
  F302: { fields: ["data.differences_counts.fewer_ballots_count"], code: "F302" },
  F303: { fields: ["data.differences_counts.fewer_ballots_count"], code: "F303" },
  F304: { fields: ["data.differences_counts.more_ballots_count"], code: "F304" },
  F305: {
    fields: [
      "data.differences_counts.fewer_ballots_count",
      "data.differences_counts.unreturned_ballots_count",
      "data.differences_counts.too_many_ballots_handed_out_count",
      "data.differences_counts.too_few_ballots_handed_out_count",
      "data.differences_counts.other_explanation_count",
      "data.differences_counts.no_explanation_count",
    ],
    code: "F305",
  },
  F401: { fields: ["data.political_group_votes[0]"], code: "F401" },
  W201: { fields: ["data.votes_counts.blank_votes_count"], code: "W201" },
  W202: { fields: ["data.voters_counts.invalid_votes_count"], code: "W202" },
  W203: {
    fields: ["data.votes_counts.total_votes_cast_count", "data.voters_counts.total_admitted_voters_count"],
    code: "W203",
  },
  W204: {
    fields: ["data.votes_counts.total_votes_cast_count", "data.voters_recounts.total_admitted_voters_count"],
    code: "W204",
  },
  W205: { fields: ["data.votes_counts.total_votes_cast_count"], code: "W205" },
  W206: {
    fields: ["data.votes_counts.total_votes_cast_count", "data.voters_counts.total_admitted_voters_count"],
    code: "W206",
  },
  W207: {
    fields: ["data.votes_counts.total_votes_cast_count", "data.voters_recounts.total_admitted_voters_count"],
    code: "W207",
  },
  W208: {
    fields: ["data.voters_counts", "data.votes_counts"],
    code: "W208",
  },
  W209: {
    fields: [
      "data.votes_counts.votes_candidates_count",
      "data.votes_counts.blank_votes_count",
      "data.votes_counts.invalid_votes_count",
      "data.votes_counts.total_votes_cast_count",
      "data.voters_recounts.poll_card_count",
      "data.voters_recounts.proxy_certificate_count",
      "data.voters_recounts.voter_card_count",
      "data.voters_recounts.total_admitted_voters_count",
    ],
    code: "W209",
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

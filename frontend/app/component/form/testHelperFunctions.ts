import { expect } from "vitest";

import {
  FormState,
  PoliticalGroup,
  POLLING_STATION_DATA_ENTRY_SAVE_REQUEST_BODY,
  ValidationResult,
} from "@kiesraad/api";
import { electionMockData } from "@kiesraad/api-mocks";
import { screen, within } from "@kiesraad/test";

export function expectFieldsToBeInvalidAndToHaveAccessibleErrorMessage(fields: Array<string>, feedbackMessage: string) {
  fields.forEach((field) => {
    const inputField = within(screen.getByTestId(`cell-${field}`)).getByRole("textbox");
    expect(inputField).toBeInvalid();
    expect(inputField).toHaveAccessibleErrorMessage(feedbackMessage);
  });
}

export function expectFieldsToHaveIconAndToHaveAccessibleName(fields: Array<string>, accessibleName: string) {
  fields.forEach((field) => {
    const icon = within(screen.getByTestId(`cell-${field}`)).getByRole("img");
    expect(icon).toHaveAccessibleName(accessibleName);
  });
}

export function expectFieldsToBeValidAndToNotHaveAccessibleErrorMessage(fields: Array<string>) {
  fields.forEach((field) => {
    const inputField = within(screen.getByTestId(`cell-${field}`)).getByRole("textbox");
    expect(inputField).toBeValid();
    expect(inputField).not.toHaveAccessibleErrorMessage();
  });
}

export function expectFieldsToNotHaveIcon(fields: Array<string>) {
  fields.forEach((field) => {
    const icon = within(screen.getByTestId(`cell-${field}`)).queryByRole("img");
    expect(icon).toBeNull();
  });
}

export const emptyDataEntryRequest: POLLING_STATION_DATA_ENTRY_SAVE_REQUEST_BODY = {
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

type ErrorMap = {
  F201: ValidationResult;
  W301: ValidationResult;
  W302: ValidationResult;
};

export const errorWarningMocks: ErrorMap = {
  F201: {
    fields: [
      "data.voters_counts.poll_card_count",
      "data.voters_counts.proxy_certificate_count",
      "data.voters_counts.voter_card_count",
      "data.voters_counts.total_admitted_voters_count",
    ],
    code: "F201",
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

export const defaultFormState: FormState = {
  current: "recounted",
  furthest: "recounted",
  sections: {
    recounted: {
      index: 0,
      id: "recounted",
      isSaved: false,
      acceptWarnings: false,
      errors: [],
      warnings: [],
    },
    voters_votes_counts: {
      index: 1,
      id: "voters_votes_counts",
      isSaved: false,
      acceptWarnings: false,
      errors: [],
      warnings: [],
    },
    differences_counts: {
      index: 2,
      id: "differences_counts",
      isSaved: false,
      acceptWarnings: false,
      errors: [],
      warnings: [],
    },
    political_group_votes_1: {
      index: 3,
      id: "political_group_votes_1",
      isSaved: false,
      acceptWarnings: false,
      errors: [],
      warnings: [],
    },
    political_group_votes_2: {
      index: 4,
      id: "political_group_votes_2",
      isSaved: false,
      acceptWarnings: false,
      errors: [],
      warnings: [],
    },
    save: {
      index: 5,
      id: "save",
      isSaved: false,
      acceptWarnings: false,
      errors: [],
      warnings: [],
    },
  },
};

export function getCandidateFullNamesFromMockData(politicalGroupMockData: PoliticalGroup): string[] {
  const candidateNames = politicalGroupMockData.candidates.map((candidate) => {
    return candidate.first_name
      ? `${candidate.last_name}, ${candidate.initials} (${candidate.first_name})`
      : `${candidate.last_name}, ${candidate.initials}`;
  });
  return candidateNames;
}

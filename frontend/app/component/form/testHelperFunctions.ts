import { expect } from "vitest";

import {
  PoliticalGroup,
  POLLING_STATION_DATA_ENTRY_SAVE_REQUEST_BODY,
  ValidationResult,
  ValidationResultCode,
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

export function getCandidateFullNamesFromMockData(politicalGroupMockData: PoliticalGroup): string[] {
  const candidateNames = politicalGroupMockData.candidates.map((candidate) => {
    return candidate.first_name
      ? `${candidate.last_name}, ${candidate.initials} (${candidate.first_name})`
      : `${candidate.last_name}, ${candidate.initials}`;
  });
  return candidateNames;
}

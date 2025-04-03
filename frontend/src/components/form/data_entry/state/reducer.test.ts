import { expect, test } from "vitest";

import { electionMockData } from "@/testing/api-mocks";

import { ApiResponseStatus, Election, PollingStationResults } from "@kiesraad/api";

import dataEntryReducer, { getInitialState as _getInitialState } from "./reducer";
import { DataEntryAction, DataEntryState } from "./types";

function getInitialState(): DataEntryState {
  return _getInitialState(electionMockData, 1, 1);
}

export function _getInitialValues(
  election: Required<Election>,
  defaultValues?: Partial<PollingStationResults>,
): PollingStationResults {
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
    political_group_votes: election.political_groups.map((pg) => ({
      number: pg.number,
      total: 0,
      candidate_votes: pg.candidates.map((c) => ({
        number: c.number,
        votes: 0,
      })),
    })),
    ...defaultValues,
  };
}

function getInitialValues() {
  return _getInitialValues(electionMockData);
}

test("should handle DATA_ENTRY_CLAIMED with client_state", () => {
  const action: DataEntryAction = {
    type: "DATA_ENTRY_CLAIMED",
    dataEntry: {
      client_state: null,
      data: getInitialValues(),
      validation_results: {
        errors: [],
        warnings: [],
      },
    },
  };
  const state = dataEntryReducer(getInitialState(), action);
  expect(state.formState).toBeDefined();
  expect(state.targetFormSectionId).toBeDefined();
  expect(state.pollingStationResults).toEqual(action.dataEntry.data);
  expect(state.error).toBeNull();
});

test("should handle DATA_ENTRY_CLAIM_FAILED", () => {
  const action: DataEntryAction = {
    type: "DATA_ENTRY_CLAIM_FAILED",
    error: {
      message: "error",
      code: 1,
      status: ApiResponseStatus.ServerError,
      reference: "InternalServerError",
      name: "test",
    },
  };

  const state = dataEntryReducer(getInitialState(), action);
  expect(state.error).toBeDefined();
  expect(state.error).toEqual(action.error);
});

test("should handle SET_STATUS", () => {
  const action: DataEntryAction = {
    type: "SET_STATUS",
    status: "saving",
  };

  const state = dataEntryReducer(getInitialState(), action);
  expect(state.status).toBeDefined();
  expect(state.status).toEqual(action.status);
});

test("should handle SET_CACHE", () => {
  const action: DataEntryAction = {
    type: "SET_CACHE",
    cache: {
      key: "recounted",
      data: {
        recounted: true,
      },
    },
  };

  const state = dataEntryReducer(getInitialState(), action);
  expect(state.cache).toBeDefined();
  expect(state.cache).toEqual(action.cache);
});

test("should handle UPDATE_FORM_SECTION", () => {
  const oldState = getInitialState();
  oldState.formState.current = "voters_votes_counts";

  const action: DataEntryAction = {
    type: "UPDATE_FORM_SECTION",
    partialFormSection: {
      hasChanges: true,
    },
  };

  const state = dataEntryReducer(oldState, action);
  expect(state.formState.sections.voters_votes_counts.hasChanges).toBeDefined();
  expect(state.formState.sections.voters_votes_counts.hasChanges).toEqual(true);
});

test("should handle FORM_SAVE_FAILED", () => {
  const action: DataEntryAction = {
    type: "FORM_SAVE_FAILED",
    error: {
      message: "error",
      code: 1,
      status: ApiResponseStatus.ServerError,
      reference: "InternalServerError",
      name: "test",
    },
  };

  const state = dataEntryReducer(getInitialState(), action);
  expect(state.error).toBeDefined();
  expect(state.error).toEqual(action.error);
});

test("should handle FORM_SAVED", () => {
  const action: DataEntryAction = {
    type: "FORM_SAVED",
    data: getInitialValues(),
    validationResults: {
      errors: [],
      warnings: [],
    },
    aborting: false,
    continueToNextSection: true,
  };

  const state = dataEntryReducer(getInitialState(), action);
  expect(state.error).toBeNull();
  expect(state.pollingStationResults).toEqual(action.data);
  expect(state.targetFormSectionId).toBeDefined();
  expect(state.targetFormSectionId).toEqual("voters_votes_counts");
});

test("should handle RESET_TARGET_FORM_SECTION", () => {
  const oldState = getInitialState();
  oldState.targetFormSectionId = "voters_votes_counts";

  const action: DataEntryAction = {
    type: "RESET_TARGET_FORM_SECTION",
  };

  const state = dataEntryReducer(oldState, action);
  expect(state.targetFormSectionId).toBeNull();
});

test("should handle REGISTER_CURRENT_FORM", () => {
  const action: DataEntryAction = {
    type: "REGISTER_CURRENT_FORM",
    formSectionId: "voters_votes_counts",
  };

  const state = dataEntryReducer(getInitialState(), action);
  expect(state.formState.current).toBeDefined();
  expect(state.formState.current).toEqual(action.formSectionId);
  expect(state.formState.sections.recounted.isSubmitted).toBeDefined();
  expect(state.formState.sections.recounted.isSubmitted).toEqual(false);
});

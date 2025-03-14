import { expect, test } from "vitest";

import { mockElection } from "app/component/election/status/mockData";

import { ApiResponseStatus } from "@kiesraad/api";

import { getInitialValues as _getInitialValues } from "./dataEntryUtils";
import dataEntryReducer, { getInitialState as _getInitialState } from "./reducer";
import { DataEntryAction, DataEntryState } from "./types";

function getInitialState(): DataEntryState {
  return _getInitialState(mockElection, 1, 1);
}

function getInitialValues() {
  return _getInitialValues(mockElection);
}

test("should handle DATA_ENTRY_LOADED with client_state", () => {
  const action: DataEntryAction = {
    type: "DATA_ENTRY_LOADED",
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

test("should handle DATA_ENTRY_NOT_FOUND", () => {
  const action: DataEntryAction = {
    type: "DATA_ENTRY_NOT_FOUND",
  };

  const state = dataEntryReducer(getInitialState(), action);
  expect(state.error).toBeNull();
  expect(state.pollingStationResults).toStrictEqual(getInitialValues());
});

test("should handle DATA_ENTRY_LOAD_FAILED", () => {
  const action: DataEntryAction = {
    type: "DATA_ENTRY_LOAD_FAILED",
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
    form: {
      id: "voters_votes_counts",
      type: "voters_and_votes",
    },
  };

  const state = dataEntryReducer(getInitialState(), action);
  expect(state.formState.current).toBeDefined();
  expect(state.formState.current).toEqual(action.form.id);
  expect(state.formState.sections.recounted.isSubmitted).toBeDefined();
  expect(state.formState.sections.recounted.isSubmitted).toEqual(false);
});

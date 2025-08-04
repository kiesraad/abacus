import { describe, expect, test, vi } from "vitest";

import { ApiClient } from "@/api/ApiClient";
import { ApiResponseStatus } from "@/api/ApiResult";
import { electionMockData } from "@/testing/api-mocks/ElectionMockData";
import {
  PollingStationDataEntryDeleteHandler,
  PollingStationDataEntryFinaliseHandler,
} from "@/testing/api-mocks/RequestHandlers";
import { validationResultMockData } from "@/testing/api-mocks/ValidationResultMockData";
import { overrideOnce, server } from "@/testing/server";
import {
  ElectionWithPoliticalGroups,
  POLLING_STATION_DATA_ENTRY_FINALISE_REQUEST_PATH,
  PollingStationResults,
} from "@/types/generated/openapi";
import { ValidationResultSet } from "@/utils/ValidationResults";

import { getDefaultDataEntryState } from "../testing/mock-data";
import { DataEntryAction, DataEntryState } from "../types/types";
import { onDeleteDataEntry, onFinaliseDataEntry, onSubmitForm } from "./actions";
import dataEntryReducer, { getInitialState as _getInitialState } from "./reducer";

function getInitialState(): DataEntryState {
  return _getInitialState(electionMockData, 1, 1);
}

export function _getInitialValues(
  election: ElectionWithPoliticalGroups,
  defaultValues?: Partial<PollingStationResults>,
): PollingStationResults {
  return {
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
    sectionId: "voters_votes_counts",
  };

  const state = dataEntryReducer(getInitialState(), action);
  expect(state.status).toBeDefined();
  expect(state.status).toEqual(action.status);
});

test("should handle SET_CACHE", () => {
  const action: DataEntryAction = {
    type: "SET_CACHE",
    cache: {
      key: "voters_votes_counts",
      data: {
        "voters_counts.poll_card_count": "100",
      },
    },
  };

  const state = dataEntryReducer(getInitialState(), action);
  expect(state.cache).toBeDefined();
  expect(state.cache).toEqual(action.cache);
});

test("should handle UPDATE_FORM_SECTION", () => {
  const oldState = getInitialState();

  const action: DataEntryAction = {
    type: "UPDATE_FORM_SECTION",
    sectionId: "voters_votes_counts",
    partialFormSection: {
      hasChanges: true,
    },
  };

  const state = dataEntryReducer(oldState, action);
  expect(state.formState.sections.voters_votes_counts!.hasChanges).toBeDefined();
  expect(state.formState.sections.voters_votes_counts!.hasChanges).toEqual(true);
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
    sectionId: "voters_votes_counts",
    aborting: false,
    continueToNextSection: true,
  };

  const state = dataEntryReducer(getInitialState(), action);
  expect(state.error).toBeNull();
  expect(state.pollingStationResults).toEqual(action.data);
  expect(state.targetFormSectionId).toBeDefined();
  expect(state.targetFormSectionId).toEqual("differences_counts");
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

describe("onSubmitForm", () => {
  test("No current section", async () => {
    const dispatch = vi.fn();
    const client = {} as ApiClient;

    const submit = onSubmitForm(client, "", dispatch, getDefaultDataEntryState());

    const result = await submit("voters_votes_counts", {}, { showAcceptErrorsAndWarnings: true });
    expect(result).toBe(false);
    expect(dispatch).toHaveBeenCalledTimes(0);
  });

  test("Unaccepted warnings", async () => {
    const dispatch = vi.fn();
    const client = {} as ApiClient;
    const defaultState = getDefaultDataEntryState();
    const state: DataEntryState = {
      ...defaultState,
      pollingStationResults: getInitialValues(),
      formState: {
        furthest: "voters_votes_counts",
        sections: {
          ...defaultState.formState.sections,
          voters_votes_counts: {
            ...defaultState.formState.sections.voters_votes_counts!,
            acceptErrorsAndWarnings: false,
            warnings: new ValidationResultSet([validationResultMockData.W201]),
          },
        },
      },
    };

    const submit = onSubmitForm(client, "", dispatch, state);

    const result = await submit("voters_votes_counts", {}, { showAcceptErrorsAndWarnings: true });
    expect(result).toBe(false);
    expect(dispatch).toHaveBeenCalledWith({
      type: "UPDATE_FORM_SECTION",
      sectionId: "voters_votes_counts",
      partialFormSection: { acceptErrorsAndWarningsError: true },
    } satisfies DataEntryAction);
  });

  test("Aborting", async () => {
    const dispatch = vi.fn();

    const defaultState = getDefaultDataEntryState();
    const state: DataEntryState = {
      ...defaultState,
      pollingStationResults: getInitialValues(),
      cache: {
        key: "voters_votes_counts",
        data: {
          "voters_counts.poll_card_count": "1",
          "voters_counts.proxy_certificate_count": "2",
          "voters_counts.total_admitted_voters_count": "4",
          "votes_counts.votes_candidates_count": "5",
          "votes_counts.blank_votes_count": "6",
          "votes_counts.invalid_votes_count": "7",
          "votes_counts.total_votes_cast_count": "8",
        },
      },
    };

    const client = new ApiClient();

    const requestPath = "/api/polling_stations/1/data_entries/1";
    const submit = onSubmitForm(client, requestPath, dispatch, state);

    overrideOnce("post", requestPath, 200, {
      validation_results: {
        errors: [],
        warnings: [],
      },
    });

    const result = await submit("voters_votes_counts", {}, { aborting: true });

    expect(dispatch).toHaveBeenCalledTimes(3);

    expect(dispatch.mock.calls[0]).toStrictEqual([
      { type: "SET_STATUS", status: "saving", sectionId: "voters_votes_counts" } satisfies DataEntryAction,
    ]);
    expect(dispatch.mock.calls[1]).toStrictEqual([{ type: "SET_STATUS", status: "aborted" } satisfies DataEntryAction]);

    const data: PollingStationResults = {
      ...getInitialValues(),
      voters_counts: {
        poll_card_count: 1,
        proxy_certificate_count: 2,
        total_admitted_voters_count: 4,
      },
      votes_counts: {
        votes_candidates_count: 5,
        blank_votes_count: 6,
        invalid_votes_count: 7,
        total_votes_cast_count: 8,
      },
    };

    expect(dispatch.mock.calls[2]).toStrictEqual([
      {
        type: "FORM_SAVED",
        data,
        validationResults: { errors: [], warnings: [] },
        sectionId: "voters_votes_counts",
        aborting: true,
        continueToNextSection: true,
      } satisfies DataEntryAction,
    ]);
    expect(result).toBe(true);
  });
});

describe("onDeleteDataEntry", () => {
  test("should handle delete data entry", async () => {
    server.use(PollingStationDataEntryDeleteHandler);

    const dispatch = vi.fn();
    const client = new ApiClient();

    const requestPath = "/api/polling_stations/1/data_entries/1";
    const onDelete = onDeleteDataEntry(client, requestPath, dispatch);

    const result = await onDelete();

    expect(dispatch).toHaveBeenCalledTimes(2);
    expect(dispatch.mock.calls[0]).toStrictEqual([
      { type: "SET_STATUS", status: "deleting" } satisfies DataEntryAction,
    ]);
    expect(dispatch.mock.calls[1]).toStrictEqual([{ type: "SET_STATUS", status: "deleted" } satisfies DataEntryAction]);

    expect(result).toBe(true);
  });
});

describe("onFinaliseDataEntry", () => {
  test("should handle finalise data entry", async () => {
    server.use(PollingStationDataEntryFinaliseHandler);
    const dispatch = vi.fn();
    const client = new ApiClient();

    const finaliseUrl: POLLING_STATION_DATA_ENTRY_FINALISE_REQUEST_PATH =
      "/api/polling_stations/1/data_entries/1/finalise";
    const onFinalise = onFinaliseDataEntry(client, finaliseUrl, dispatch);

    const result = await onFinalise();

    expect(dispatch).toHaveBeenCalledTimes(2);
    expect(dispatch.mock.calls[0]).toStrictEqual([
      { type: "SET_STATUS", status: "finalising" } satisfies DataEntryAction,
    ]);
    expect(dispatch.mock.calls[1]).toStrictEqual([
      { type: "SET_STATUS", status: "finalised" } satisfies DataEntryAction,
    ]);

    expect(result?.status).toBe("second_entry_not_started");
  });
});

import { ApiClient, ApiResult, isSuccess } from "@kiesraad/api";

import { DataEntry, PollingStationResults, SaveDataEntryResponse } from "@/types/generated/openapi";

import { calculateDataEntryProgress, getClientState } from "./dataEntryUtils";
import {
  DataEntryDispatch,
  DataEntryState,
  FormSection,
  FormSectionReference,
  SubmitCurrentFormOptions,
  TemporaryCache,
} from "./types";

export function registerForm(dispatch: DataEntryDispatch) {
  return (form: FormSectionReference) => {
    dispatch({ type: "REGISTER_CURRENT_FORM", form });
  };
}

export function setCache(dispatch: DataEntryDispatch) {
  return (cache: TemporaryCache) => {
    dispatch({ type: "SET_CACHE", cache });
  };
}

export function updateFormSection(dispatch: DataEntryDispatch) {
  return (partialFormSection: Partial<FormSection>) => {
    dispatch({ type: "UPDATE_FORM_SECTION", partialFormSection });
  };
}

export function onSubmitForm(
  client: ApiClient,
  requestPath: string,
  dispatch: DataEntryDispatch,
  state: DataEntryState,
) {
  return async (
    partialPollingStationResults: Partial<PollingStationResults>,
    { aborting = false, continueToNextSection = true, showAcceptWarnings = true }: SubmitCurrentFormOptions = {},
  ): Promise<boolean> => {
    const currentSection = state.formState.sections[state.formState.current];

    if (!currentSection || !state.pollingStationResults) {
      return false;
    }

    if (
      !aborting &&
      currentSection.errors.length === 0 &&
      currentSection.warnings.length > 0 &&
      showAcceptWarnings &&
      !currentSection.acceptWarnings
    ) {
      dispatch({ type: "UPDATE_FORM_SECTION", partialFormSection: { acceptWarningsError: true } });
      return false;
    }

    const data: PollingStationResults = aborting
      ? {
          ...state.pollingStationResults,
          ...partialPollingStationResults,
          ...state.cache?.data,
        }
      : {
          ...state.pollingStationResults,
          ...partialPollingStationResults,
        };

    if (data.recounted === false) {
      // remove recount if recount has changed to no
      data.voters_recounts = undefined;
    }
    // prepare data to send to server
    const clientState = getClientState(state.formState, currentSection.acceptWarnings, continueToNextSection);
    const progress = calculateDataEntryProgress(state.formState);

    // send data to server
    dispatch({ type: "SET_STATUS", status: "saving" });

    const response: ApiResult<SaveDataEntryResponse> = await client.postRequest(requestPath, {
      progress,
      data,
      client_state: clientState,
    } satisfies DataEntry);

    dispatch({ type: "SET_STATUS", status: aborting ? "aborted" : "idle" });

    // handle validation errors
    if (!isSuccess(response)) {
      dispatch({ type: "FORM_SAVE_FAILED", error: response });
      return false;
    }

    dispatch({
      type: "FORM_SAVED",
      data,
      validationResults: response.data.validation_results,
      aborting,
      continueToNextSection,
    });

    return true;
  };
}

export function onDeleteDataEntry(client: ApiClient, requestPath: string, dispatch: DataEntryDispatch) {
  return async (): Promise<boolean> => {
    dispatch({ type: "SET_STATUS", status: "deleting" });

    const response = await client.deleteRequest(requestPath);

    if (!isSuccess(response)) {
      dispatch({ type: "SET_STATUS", status: "idle" });
      dispatch({ type: "FORM_SAVE_FAILED", error: response });
      return false;
    }

    dispatch({ type: "SET_STATUS", status: "deleted" });
    return true;
  };
}

export function onFinaliseDataEntry(client: ApiClient, requestPath: string, dispatch: DataEntryDispatch) {
  return async (): Promise<boolean> => {
    dispatch({ type: "SET_STATUS", status: "finalising" });

    const response = await client.postRequest(requestPath + "/finalise");

    if (!isSuccess(response)) {
      dispatch({ type: "SET_STATUS", status: "idle" });
      dispatch({ type: "FORM_SAVE_FAILED", error: response });
      return false;
    }

    dispatch({ type: "SET_STATUS", status: "finalised" });
    return true;
  };
}

import {
  ApiClient,
  ApiResult,
  DataEntry,
  isSuccess,
  PollingStationResults,
  SaveDataEntryResponse,
} from "@kiesraad/api";

import { calculateDataEntryProgress, getClientState, updateFormStateAfterSubmit } from "./dataEntryUtils";
import { DataEntryDispatch, DataEntryState, FormSectionReference, SubmitCurrentFormOptions, TemporaryCache } from "./types";

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

export function onSubmitForm(
  client: ApiClient,
  requestPath: string,
  dispatch: DataEntryDispatch,
  state: DataEntryState,
) {
  return async (
    data: Partial<PollingStationResults>,
    { acceptWarnings = false, aborting = false, continueToNextSection = true }: SubmitCurrentFormOptions = {},
  ): Promise<boolean> => {
    const newValues: PollingStationResults = {
      ...state.pollingStationResults!,
      ...data,
    };

    // prepare data to send to server
    const clientState = getClientState(state.formState, acceptWarnings, continueToNextSection);
    const progress = calculateDataEntryProgress(state.formState);

    // send data to server
    dispatch({ type: "SET_STATUS", status: "saving" });

    const response: ApiResult<SaveDataEntryResponse> = await client.postRequest(requestPath, {
      progress,
      data: newValues,
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
      data: newValues,
      formState: updateFormStateAfterSubmit(
        state.formState,
        response.data.validation_results,
        acceptWarnings,
        !aborting,
      ),
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

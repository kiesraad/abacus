import {
  ApiClient,
  ApiError,
  ApiResult,
  DataEntry,
  isFatalError,
  PollingStationResults,
  SaveDataEntryResponse,
} from "@kiesraad/api";

import { calculateDataEntryProgress, getClientState, updateFormStateAfterSubmit } from "./dataEntryUtils";
import { DataEntryDispatch, DataEntryState, FormSectionData, SubmitCurrentFormOptions } from "./types";

export function onSubmitForm(
  client: ApiClient,
  requestPath: string,
  dispatch: DataEntryDispatch,
  state: DataEntryState,
) {
  return async (
    data: FormSectionData,
    { acceptWarnings = false, aborting = false, continueToNextSection = true }: SubmitCurrentFormOptions = {},
  ) => {
    const newValues: PollingStationResults = {
      ...state.pollingStationResults!,
      ...data,
    };

    // prepare data to send to server
    const clientState = getClientState(state.formState, acceptWarnings, continueToNextSection);
    const progress = calculateDataEntryProgress(state.formState);

    // send data to server
    dispatch({ type: "SET_FORM_STATUS", status: "saving" });

    const response: ApiResult<SaveDataEntryResponse> = await client.postRequest(requestPath, {
      progress,
      data: newValues,
      client_state: clientState,
    } satisfies DataEntry);

    dispatch({ type: "SET_FORM_STATUS", status: aborting ? "aborted" : "idle" });

    // check for a fatal error and render full page error
    if (isFatalError(response)) {
      throw response;
    }

    // handle validation errors
    if (response instanceof ApiError) {
      dispatch({ type: "FORM_SAVE_FAILED", error: response });
      return;
    }

    dispatch({
      type: "FORM_SAVED",
      formState: updateFormStateAfterSubmit(
        state.formState,
        response.data.validation_results,
        acceptWarnings,
        !aborting,
      ),
      continueToNextSection,
    });
  };
}

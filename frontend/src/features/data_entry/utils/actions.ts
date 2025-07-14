import { ApiClient } from "@/api/ApiClient";
import { ApiResult, isSuccess } from "@/api/ApiResult";
import { DataEntry, DataEntryStatusResponse, SaveDataEntryResponse } from "@/types/generated/openapi";
import { FormSectionId, SectionValues } from "@/types/types";
import { mapSectionValues } from "@/utils/dataEntryMapping";

import {
  DataEntryDispatch,
  DataEntryState,
  FormSection,
  SubmitCurrentFormOptions,
  TemporaryCache,
} from "../types/types";
import { calculateDataEntryProgress, getClientState } from "./dataEntryUtils";

export function setCache(dispatch: DataEntryDispatch) {
  return (cache: TemporaryCache) => {
    dispatch({ type: "SET_CACHE", cache });
  };
}

export function updateFormSection(dispatch: DataEntryDispatch) {
  return (sectionId: FormSectionId, partialFormSection: Partial<FormSection>) => {
    dispatch({ type: "UPDATE_FORM_SECTION", sectionId, partialFormSection });
  };
}

export function onSubmitForm(
  client: ApiClient,
  requestPath: string,
  dispatch: DataEntryDispatch,
  state: DataEntryState,
) {
  return async (
    sectionId: FormSectionId,
    currentValues: SectionValues,
    {
      aborting = false,
      continueToNextSection = true,
      showAcceptErrorsAndWarnings = true,
    }: SubmitCurrentFormOptions = {},
  ): Promise<boolean> => {
    const currentSection = state.formState.sections[sectionId];

    if (!currentSection || !state.pollingStationResults) {
      return false;
    }

    if (
      !aborting &&
      (!currentSection.errors.isEmpty() || !currentSection.warnings.isEmpty()) &&
      showAcceptErrorsAndWarnings &&
      !currentSection.acceptErrorsAndWarnings
    ) {
      dispatch({
        type: "UPDATE_FORM_SECTION",
        sectionId: sectionId,
        partialFormSection: { acceptErrorsAndWarningsError: true },
      });
      return false;
    }

    const dataEntrySection = state.dataEntryStructure.find((s) => s.id === currentSection.id);
    if (!dataEntrySection) {
      return false;
    }

    let data = mapSectionValues(state.pollingStationResults, currentValues, dataEntrySection);
    if (aborting && state.cache) {
      const cache = state.cache;
      const cachedDataEntrySection = state.dataEntryStructure.find((s) => s.id === cache.key);
      if (cachedDataEntrySection) {
        data = mapSectionValues(data, cache.data, cachedDataEntrySection);
      }
    }

    if (data.recounted === false) {
      // remove recount if recount has changed to no
      data.voters_recounts = undefined;
    } else if (data.recounted === true && data.voters_recounts === undefined) {
      data.voters_recounts = {
        poll_card_count: 0,
        proxy_certificate_count: 0,
        voter_card_count: 0,
        total_admitted_voters_count: 0,
      };
    }

    // prepare data to send to server
    const clientState = getClientState(
      state.formState,
      sectionId,
      currentSection.acceptErrorsAndWarnings,
      continueToNextSection,
    );
    const progress = calculateDataEntryProgress(state.formState);

    // send data to server
    dispatch({ type: "SET_STATUS", status: "saving", sectionId });

    const response: ApiResult<SaveDataEntryResponse> = await client.postRequest(requestPath, {
      progress,
      data,
      client_state: clientState,
    } satisfies DataEntry);

    dispatch({ type: "SET_STATUS", status: aborting ? "aborted" : "idle" });

    if (!isSuccess(response)) {
      dispatch({ type: "FORM_SAVE_FAILED", error: response });
      return false;
    }

    // handle validation errors
    dispatch({
      type: "FORM_SAVED",
      data,
      validationResults: response.data.validation_results,
      sectionId,
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
  return async (): Promise<DataEntryStatusResponse | undefined> => {
    dispatch({ type: "SET_STATUS", status: "finalising" });

    const response = await client.postRequest<DataEntryStatusResponse>(requestPath);

    if (!isSuccess(response)) {
      dispatch({ type: "SET_STATUS", status: "idle" });
      dispatch({ type: "FORM_SAVE_FAILED", error: response });
      return undefined;
    }

    dispatch({ type: "SET_STATUS", status: "finalised" });
    return response.data;
  };
}

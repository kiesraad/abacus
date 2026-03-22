import { useReducer } from "react";

import { useApiClient } from "@/api/useApiClient";
import type {
  DATA_ENTRY_CLAIM_REQUEST_PATH,
  DATA_ENTRY_DISCARD_REQUEST_PATH,
  DATA_ENTRY_FINALISE_REQUEST_PATH,
  DATA_ENTRY_SAVE_REQUEST_PATH,
  ElectionWithPoliticalGroups,
} from "@/types/generated/openapi";
import type { FormSectionId } from "@/types/types";

import type { DataEntryStateAndActions } from "../types/types";
import { onDiscardDataEntry, onFinaliseDataEntry, onSubmitForm, setCache, updateFormSection } from "../utils/actions";
import dataEntryReducer, { getInitialState } from "../utils/reducer";
import useDataEntryNavigation from "./useDataEntryNavigation";
import { useInitialDataEntryState } from "./useInitialDataEntryState";

export default function useDataEntry(
  election: ElectionWithPoliticalGroups,
  pollingStationId: number,
  entryNumber: number,
  sectionId: FormSectionId | null,
): DataEntryStateAndActions {
  const client = useApiClient();
  const [state, dispatch] = useReducer(dataEntryReducer, getInitialState(election, pollingStationId, entryNumber));

  // initial request to get the current data entry from the backend
  const saveRequestPath: DATA_ENTRY_SAVE_REQUEST_PATH = `/api/polling_stations/${pollingStationId}/data_entries/${entryNumber}`;
  const discardRequestPath: DATA_ENTRY_DISCARD_REQUEST_PATH = `/api/polling_stations/${pollingStationId}/data_entries/${entryNumber}`;
  const finaliseRequestPath: DATA_ENTRY_FINALISE_REQUEST_PATH = `/api/polling_stations/${pollingStationId}/data_entries/${entryNumber}/finalise`;
  const claimRequestPath: DATA_ENTRY_CLAIM_REQUEST_PATH = `${saveRequestPath}/claim`;
  useInitialDataEntryState(client, dispatch, claimRequestPath);

  // navigate to the correct section
  useDataEntryNavigation(state, dispatch, election, pollingStationId, entryNumber, sectionId);

  return {
    ...state,
    dispatch,
    onSubmitForm: onSubmitForm(client, saveRequestPath, dispatch, state),
    onDiscardDataEntry: onDiscardDataEntry(client, discardRequestPath, dispatch),
    onFinaliseDataEntry: onFinaliseDataEntry(client, finaliseRequestPath, dispatch),
    setCache: setCache(dispatch),
    updateFormSection: updateFormSection(dispatch),
  };
}

import { useReducer } from "react";

import { useApiClient } from "@/api/useApiClient";
import {
  ElectionWithPoliticalGroups,
  POLLING_STATION_DATA_ENTRY_CLAIM_REQUEST_PATH,
  POLLING_STATION_DATA_ENTRY_DELETE_REQUEST_PATH,
  POLLING_STATION_DATA_ENTRY_FINALISE_REQUEST_PATH,
  POLLING_STATION_DATA_ENTRY_SAVE_REQUEST_PATH,
} from "@/types/generated/openapi";
import { FormSectionId } from "@/types/types";

import { DataEntryStateAndActions } from "../types/types";
import { onDeleteDataEntry, onFinaliseDataEntry, onSubmitForm, setCache, updateFormSection } from "../utils/actions";
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
  const saveRequestPath: POLLING_STATION_DATA_ENTRY_SAVE_REQUEST_PATH = `/api/polling_stations/${pollingStationId}/data_entries/${entryNumber}`;
  const deleteRequestPath: POLLING_STATION_DATA_ENTRY_DELETE_REQUEST_PATH = `/api/polling_stations/${pollingStationId}/data_entries/${entryNumber}`;
  const finaliseRequestPath: POLLING_STATION_DATA_ENTRY_FINALISE_REQUEST_PATH = `/api/polling_stations/${pollingStationId}/data_entries/${entryNumber}/finalise`;
  const claimRequestPath: POLLING_STATION_DATA_ENTRY_CLAIM_REQUEST_PATH = `${saveRequestPath}/claim`;
  useInitialDataEntryState(client, dispatch, claimRequestPath);

  // navigate to the correct section
  useDataEntryNavigation(state, dispatch, election, pollingStationId, entryNumber, sectionId);

  return {
    ...state,
    dispatch,
    onSubmitForm: onSubmitForm(client, saveRequestPath, dispatch, state),
    onDeleteDataEntry: onDeleteDataEntry(client, deleteRequestPath, dispatch),
    onFinaliseDataEntry: onFinaliseDataEntry(client, finaliseRequestPath, dispatch),
    setCache: setCache(dispatch),
    updateFormSection: updateFormSection(dispatch),
  };
}

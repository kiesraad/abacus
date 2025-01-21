import { Election, POLLING_STATION_DATA_ENTRY_SAVE_REQUEST_PATH, useApi } from "@kiesraad/api";
import { onDeleteDataEntry, onFinaliseDataEntry, onSubmitForm, registerForm, setCache } from "./actions";
import dataEntryReducer, { getInitialState } from "./reducer";
import { DataEntryStateAndActions } from "./types";
import { useInitialDataEntryState } from "./useInitialDataEntryState";
import useDataEntryNavigation from "./useDataEntryNavigation";
import { useReducer } from "react";

export default function useDataEntry(
  election: Required<Election>,
  pollingStationId: number,
  entryNumber: number,
): DataEntryStateAndActions {
  const client = useApi();
  const [state, dispatch] = useReducer(dataEntryReducer, getInitialState(election, pollingStationId, entryNumber));

  // initial request to get the current data entry from the backend
  const requestPath: POLLING_STATION_DATA_ENTRY_SAVE_REQUEST_PATH = `/api/polling_stations/${pollingStationId}/data_entries/${entryNumber}`;
  useInitialDataEntryState(client, dispatch, election, requestPath);

  // navigate to the correct section
  useDataEntryNavigation(state, dispatch, election, pollingStationId, entryNumber);

  return {
    ...state,
    dispatch,
    onSubmitForm: onSubmitForm(client, requestPath, dispatch, state),
    onDeleteDataEntry: onDeleteDataEntry(client, requestPath, dispatch),
    onFinaliseDataEntry: onFinaliseDataEntry(client, requestPath, dispatch),
    register: registerForm(dispatch),
    setCache: setCache(dispatch),
  };
}

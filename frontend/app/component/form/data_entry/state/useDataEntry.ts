import { useReducer } from "react";

import { Election, POLLING_STATION_DATA_ENTRY_SAVE_REQUEST_PATH, useApi } from "@kiesraad/api";

import { onSubmitForm } from "./actions";
import dataEntryReducer, { getInitialState } from "./reducer";
import { DataEntryStateAndActions } from "./types";
import { useInitialDataEntryState } from "./useInitialDataEntryState";

export default function useDataEntry(
  election: Required<Election>,
  pollingStationId: number,
  entryNumber: number,
): DataEntryStateAndActions {
  const client = useApi();
  const [state, dispatch] = useReducer(dataEntryReducer, getInitialState(election));

  // initial request to get the current data entry from the backend
  const requestPath: POLLING_STATION_DATA_ENTRY_SAVE_REQUEST_PATH = `/api/polling_stations/${pollingStationId}/data_entries/${entryNumber}`;
  useInitialDataEntryState(client, dispatch, election, requestPath);

  return {
    ...state,
    dispatch,
    onSubmitForm: onSubmitForm(client, requestPath, dispatch, state),
  };
}

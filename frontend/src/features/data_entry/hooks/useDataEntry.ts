import { useReducer } from "react";

import { useApiClient } from "@/api/useApiClient";
import {
  Election,
  POLLING_STATION_DATA_ENTRY_CLAIM_REQUEST_PATH,
  POLLING_STATION_DATA_ENTRY_SAVE_REQUEST_PATH,
} from "@/types/generated/openapi";

import { DataEntryState, DataEntryStateAndActions } from "../types/types";
import {
  onDeleteDataEntry,
  onFinaliseDataEntry,
  onSubmitForm,
  registerForm,
  setCache,
  updateFormSection,
} from "../utils/actions";
import dataEntryReducer, { getInitialState } from "../utils/reducer";
import useDataEntryNavigation from "./useDataEntryNavigation";
import { useInitialDataEntryState } from "./useInitialDataEntryState";

export default function useDataEntry(
  election: Required<Election>,
  pollingStationId: number,
  entryNumber: number,
  initialDataEntryState?: DataEntryState,
): DataEntryStateAndActions {
  const client = useApiClient();
  const [state, dispatch] = useReducer(
    dataEntryReducer,
    initialDataEntryState || getInitialState(election, pollingStationId, entryNumber),
  );

  // initial request to get the current data entry from the backend
  const saveRequestPath: POLLING_STATION_DATA_ENTRY_SAVE_REQUEST_PATH = `/api/polling_stations/${pollingStationId}/data_entries/${entryNumber}`;
  const claimRequestPath: POLLING_STATION_DATA_ENTRY_CLAIM_REQUEST_PATH = `${saveRequestPath}/claim`;
  useInitialDataEntryState(client, dispatch, election, saveRequestPath, claimRequestPath);

  // navigate to the correct section
  useDataEntryNavigation(state, dispatch, election, pollingStationId, entryNumber);

  return {
    ...state,
    dispatch,
    onSubmitForm: onSubmitForm(client, saveRequestPath, dispatch, state),
    onDeleteDataEntry: onDeleteDataEntry(client, saveRequestPath, dispatch),
    onFinaliseDataEntry: onFinaliseDataEntry(client, saveRequestPath, dispatch),
    register: registerForm(dispatch),
    setCache: setCache(dispatch),
    updateFormSection: updateFormSection(dispatch),
  };
}

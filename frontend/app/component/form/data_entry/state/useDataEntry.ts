import { useEffect, useReducer } from "react";
import { useNavigate } from "react-router";

import { getBaseUrl, getUrlForFormSectionID } from "app/component/pollingstation/utils";

import { Election, POLLING_STATION_DATA_ENTRY_SAVE_REQUEST_PATH, useApi } from "@kiesraad/api";

import { onDeleteDataEntry, onFinaliseDataEntry, onSubmitForm } from "./actions";
import dataEntryReducer, { getInitialState } from "./reducer";
import { DataEntryStateAndActions, FormSectionReference, TemporaryCache } from "./types";
import { useInitialDataEntryState } from "./useInitialDataEntryState";

export default function useDataEntry(
  election: Required<Election>,
  pollingStationId: number,
  entryNumber: number,
): DataEntryStateAndActions {
  const client = useApi();
  const navigate = useNavigate();

  const [state, dispatch] = useReducer(dataEntryReducer, getInitialState(election, pollingStationId, entryNumber));

  // initial request to get the current data entry from the backend
  const requestPath: POLLING_STATION_DATA_ENTRY_SAVE_REQUEST_PATH = `/api/polling_stations/${pollingStationId}/data_entries/${entryNumber}`;
  useInitialDataEntryState(client, dispatch, election, requestPath);

  // check if the targetFormSectionID has changed and navigate to the url for that section
  useEffect(() => {
    if (state.targetFormSectionId) {
      const url = getUrlForFormSectionID(election.id, pollingStationId, entryNumber, state.targetFormSectionId);
      if (location.pathname === getBaseUrl(election.id, pollingStationId, entryNumber)) {
        void navigate(url, { replace: true });
      } else if (location.pathname !== url) {
        void navigate(url);
      }
      dispatch({ type: "RESET_TARGET_FORM_SECTION" });
    }
  }, [state.targetFormSectionId, navigate, election.id, pollingStationId, entryNumber, location.pathname]);

  return {
    ...state,
    dispatch,
    onSubmitForm: onSubmitForm(client, requestPath, dispatch, state),
    onDeleteDataEntry: onDeleteDataEntry(client, requestPath, dispatch),
    onFinaliseDataEntry: onFinaliseDataEntry(client, requestPath, dispatch),
    register: (form: FormSectionReference) => dispatch({ type: "REGISTER_CURRENT_FORM", form }),
    setCache: (cache: TemporaryCache) => dispatch({ type: "SET_CACHE", cache }),
  };
}

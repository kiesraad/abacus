import { useEffect, useReducer } from "react";

import {
  ApiClient,
  DataEntry,
  DEFAULT_CANCEL_REASON,
  Election,
  GetDataEntryResponse,
  isSuccess,
  NotFoundError,
  POLLING_STATION_DATA_ENTRY_SAVE_REQUEST_PATH,
  useApi,
} from "@kiesraad/api";

import { AnyFormReference } from "../PollingStationFormController";
import { getClientState, getInitialFormState, getInitialValues } from "../pollingStationUtils";
import dataEntryReducer, { getInitialState } from "./reducer";
import { DataEntryDispatch, DataEntryStateAndActions } from "./types";

async function saveDataEntryState(
  requestPath: string,
  dataEntry: DataEntry,
  client: ApiClient,
  dispatch: DataEntryDispatch,
) {
  if (!dataEntry.client_state) {
    return;
  }

  // save data entry, continue is set to true to make sure polling station status changes to InProgress
  // TODO: check whether this is always necessary
  const requestBody: DataEntry = {
    progress: dataEntry.progress,
    data: dataEntry.data,
    client_state: {
      ...dataEntry.client_state,
      continue: true,
    },
  };
  const postResult = await client.postRequest(requestPath, requestBody);

  if (!isSuccess(postResult)) {
    dispatch({
      type: "DATA_ENTRY_SAVE_FAILED",
      error: postResult,
    });
  }
}

async function saveNewDataEntryState(
  requestPath: string,
  election: Required<Election>,
  client: ApiClient,
  dispatch: DataEntryDispatch,
) {
  const formState = getInitialFormState(election);
  const requestBody: DataEntry = {
    progress: 0,
    data: getInitialValues(election),
    client_state: getClientState(formState, false, true),
  };
  const postResult = await client.postRequest(requestPath, requestBody);

  if (!isSuccess(postResult)) {
    dispatch({
      type: "DATA_ENTRY_SAVE_FAILED",
      error: postResult,
    });
  }
}

function useInitialDataEntryState(
  client: ApiClient,
  dispatch: DataEntryDispatch,
  election: Required<Election>,
  pollingStationId: number,
  entryNumber: number,
) {
  useEffect(() => {
    const abortController = new AbortController();

    const getDataEntry = async () => {
      const requestPath: POLLING_STATION_DATA_ENTRY_SAVE_REQUEST_PATH = `/api/polling_stations/${pollingStationId}/data_entries/${entryNumber}`;
      const result = await client.getRequest<GetDataEntryResponse>(requestPath);

      if (isSuccess(result)) {
        const dataEntry = result.data;

        dispatch({
          type: "DATA_ENTRY_LOADED",
          dataEntry,
        });

        await saveDataEntryState(requestPath, dataEntry, client, dispatch);
      } else if (result instanceof NotFoundError) {
        dispatch({
          type: "DATA_ENTRY_NOT_FOUND",
        });

        await saveNewDataEntryState(requestPath, election, client, dispatch);
      } else {
        dispatch({
          type: "DATA_ENTRY_LOAD_FAILED",
          error: result,
        });
      }
    };

    void getDataEntry();

    return () => {
      abortController.abort(DEFAULT_CANCEL_REASON);
    };
  }, [client, dispatch, election, pollingStationId, entryNumber]);
}

export default function useDataEntry(
  election: Required<Election>,
  pollingStationId: number,
  entryNumber: number,
): DataEntryStateAndActions {
  const client = useApi();
  const [state, dispatch] = useReducer(dataEntryReducer, getInitialState(election));

  // Initial request to get the data entry
  useInitialDataEntryState(client, dispatch, election, pollingStationId, entryNumber);

  return {
    ...state,
    registerCurrentForm: (form: AnyFormReference) => {
      dispatch({
        type: "REGISTER_CURRENT_FORM",
        form,
      });
    },
  };
}

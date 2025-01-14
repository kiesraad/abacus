import { useEffect, useReducer } from "react";
import { DataEntryDispatch, DataEntryStateAndActions } from "./types";
import dataEntryReducer, { getInitialState } from "./reducer";
import { ApiClient, DEFAULT_CANCEL_REASON, Election, GetDataEntryResponse, isSuccess, POLLING_STATION_DATA_ENTRY_SAVE_REQUEST_PATH, useApi, useApiRequestWithErrors } from "@kiesraad/api";

function useInitialDataEntryState(
  client: ApiClient,
  dispatch: DataEntryDispatch,
  pollingStationId: number,
  entryNumber: number
) {
  useEffect(() => {
    const abortController = new AbortController();

    const getDataEntry = async () => {
      const requestPath: POLLING_STATION_DATA_ENTRY_SAVE_REQUEST_PATH = `/api/polling_stations/${pollingStationId}/data_entries/${entryNumber}`;
      const result = await client.getRequest<GetDataEntryResponse>(requestPath);

      if (isSuccess(result)) {
        dispatch({
          type: "DATA_ENTRY_LOADED",
          dataEntry: result.data,
        });
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
  }, [client, pollingStationId, entryNumber]);
}


export default function useDataEntry(
  election: Required<Election>,
  pollingStationId: number,
  entryNumber: number
): DataEntryStateAndActions {
  const client = useApi();
  const [state, dispatch] = useReducer(dataEntryReducer, getInitialState(election));

  // Initial request to get the data entry
  useInitialDataEntryState(client, dispatch, pollingStationId, entryNumber);

  return {
    ...state,
  };
}

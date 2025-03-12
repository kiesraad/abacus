import { useEffect } from "react";

import { ApiClient, DEFAULT_CANCEL_REASON, isSuccess, NotFoundError } from "@/api";
import { DataEntry, Election, GetDataEntryResponse } from "@/types/generated/openapi";

import { getClientState, getInitialFormState, getInitialValues } from "./dataEntryUtils";
import { DataEntryDispatch } from "./types";

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

export function useInitialDataEntryState(
  client: ApiClient,
  dispatch: DataEntryDispatch,
  election: Required<Election>,
  requestPath: string,
) {
  useEffect(() => {
    const abortController = new AbortController();

    const getDataEntry = async () => {
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
  }, [client, dispatch, election, requestPath]);
}

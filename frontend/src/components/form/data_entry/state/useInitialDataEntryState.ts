import { useEffect } from "react";

import { ApiClient, ClaimDataEntryResponse, DEFAULT_CANCEL_REASON, Election, isSuccess } from "@kiesraad/api";

import { DataEntryDispatch } from "./types";

export function useInitialDataEntryState(
  client: ApiClient,
  dispatch: DataEntryDispatch,
  election: Required<Election>,
  saveRequestPath: string,
  claimRequestPath: string,
) {
  useEffect(() => {
    const abortController = new AbortController();

    const claimDataEntry = async () => {
      const result = await client.postRequest<ClaimDataEntryResponse>(claimRequestPath);

      if (isSuccess(result)) {
        const dataEntry = result.data;

        dispatch({
          type: "DATA_ENTRY_LOADED",
          dataEntry,
        });
      } else {
        dispatch({
          type: "DATA_ENTRY_LOAD_FAILED",
          error: result,
        });
      }
    };

    void claimDataEntry();

    return () => {
      abortController.abort(DEFAULT_CANCEL_REASON);
    };
  }, [client, dispatch, election, claimRequestPath, saveRequestPath]);
}

import { useEffect } from "react";

import { ApiClient, DEFAULT_CANCEL_REASON } from "@/api/ApiClient";
import { isSuccess } from "@/api/ApiResult";
import { ClaimDataEntryResponse, Election } from "@/types/generated/openapi";

import { DataEntryDispatch } from "../types/types";

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
          type: "DATA_ENTRY_CLAIMED",
          dataEntry,
        });
      } else {
        dispatch({
          type: "DATA_ENTRY_CLAIM_FAILED",
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

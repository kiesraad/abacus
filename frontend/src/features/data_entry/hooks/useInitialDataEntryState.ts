import { useEffect } from "react";

import { type ApiClient, DEFAULT_CANCEL_REASON } from "@/api/ApiClient";
import { isSuccess } from "@/api/ApiResult";
import type { ClaimDataEntryResponse, Election } from "@/types/generated/openapi";

import type { DataEntryDispatch } from "../types/types";

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

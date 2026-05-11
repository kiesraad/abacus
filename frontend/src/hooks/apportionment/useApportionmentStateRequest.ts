import { useEffect, useState } from "react";

import { type AnyApiError, isSuccess } from "@/api/ApiResult";
import { useApiClient } from "@/api/useApiClient";
import type { ApportionmentState, GET_APPORTIONMENT_STATE_REQUEST_PATH } from "@/types/generated/openapi";

export function useApportionmentStateRequest(electionId: number) {
  const path: GET_APPORTIONMENT_STATE_REQUEST_PATH = `/api/elections/${electionId}/apportionment/state`;
  const [data, setData] = useState<ApportionmentState>();
  const [error, setError] = useState<AnyApiError>();
  const client = useApiClient();

  useEffect(() => {
    void client.getRequest<ApportionmentState>(path).then((response) => {
      if (isSuccess(response)) {
        setData(response.data);
      } else {
        setError(response);
      }
    });
  }, [client, path]);

  return { error, data };
}

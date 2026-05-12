import { useEffect, useState } from "react";

import { type AnyApiError, isSuccess } from "@/api/ApiResult";
import { useApiClient } from "@/api/useApiClient";
import type { ElectionApportionmentResponse, PROCESS_APPORTIONMENT_REQUEST_PATH } from "@/types/generated/openapi";

export function useApportionmentRequest(electionId: number) {
  const path: PROCESS_APPORTIONMENT_REQUEST_PATH = `/api/elections/${electionId}/apportionment`;
  const [data, setData] = useState<ElectionApportionmentResponse>();
  const [error, setError] = useState<AnyApiError>();
  const client = useApiClient();

  useEffect(() => {
    void client.postRequest<ElectionApportionmentResponse>(path).then((response) => {
      if (isSuccess(response)) {
        setData(response.data);
      } else {
        setError(response);
      }
    });
  }, [client, path]);

  return { error, data };
}

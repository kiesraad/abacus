import { useCallback, useEffect, useState } from "react";

import { type AnyApiError, type ApiResult, isSuccess } from "@/api/ApiResult";
import { useApiClient } from "@/api/useApiClient";
import type { ElectionApportionmentResponse, PROCESS_APPORTIONMENT_REQUEST_PATH } from "@/types/generated/openapi";

function handleApiResult(
  response: ApiResult<ElectionApportionmentResponse>,
  setData: (data: ElectionApportionmentResponse | undefined) => void,
  setError: (error: AnyApiError | undefined) => void,
) {
  if (isSuccess(response)) {
    setData(response.data);
    setError(undefined);
  } else {
    setError(response);
  }
}

export function useApportionmentRequest(electionId: number) {
  const path: PROCESS_APPORTIONMENT_REQUEST_PATH = `/api/elections/${electionId}/apportionment`;
  const [data, setData] = useState<ElectionApportionmentResponse>();
  const [error, setError] = useState<AnyApiError>();
  const client = useApiClient();

  const refetch = useCallback(async () => {
    const response = await client.postRequest<ElectionApportionmentResponse>(path);
    handleApiResult(response, setData, setError);
    return response;
  }, [client, path]);

  useEffect(() => {
    void client.postRequest<ElectionApportionmentResponse>(path).then((response) => {
      handleApiResult(response, setData, setError);
    });
  }, [client, path]);

  return { error, data, refetch };
}

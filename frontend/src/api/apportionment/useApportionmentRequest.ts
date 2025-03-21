import { useEffect, useState } from "react";

import {
  AnyApiError,
  ELECTION_APPORTIONMENT_REQUEST_PATH,
  ElectionApportionmentResponse,
  isSuccess,
  useApiClient,
} from "../index";

export function useApportionmentRequest(electionId: number) {
  const path: ELECTION_APPORTIONMENT_REQUEST_PATH = `/api/elections/${electionId}/apportionment`;
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

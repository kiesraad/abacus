import { useEffect, useState } from "react";

import {
  AnyApiError,
  ELECTION_APPORTIONMENT_REQUEST_PATH,
  ElectionApportionmentResponse,
  isSuccess,
  useApi,
} from "../index";

export function useApportionmentRequest(electionId: number) {
  const path: ELECTION_APPORTIONMENT_REQUEST_PATH = `/api/elections/${electionId}/apportionment`;
  const [data, setData] = useState<ElectionApportionmentResponse>();
  const [apiError, setApiError] = useState<AnyApiError>();
  const client = useApi();

  useEffect(() => {
    void client.postRequest<ElectionApportionmentResponse>(path).then((response) => {
      if (isSuccess(response)) {
        setData(response.data);
      } else {
        setApiError(response);
      }
    });
  }, [client, path]);

  return { apiError, data };
}

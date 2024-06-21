import * as React from "react";
import { useApiGetRequest } from "./useApiGetRequest";
import {
  Election,
  ELECTION_DETAILS_REQUEST_PARAMS,
  ELECTION_DETAILS_REQUEST_PATH,
} from "./gen/openapi";

export function useElectionDataRequest(params: ELECTION_DETAILS_REQUEST_PARAMS) {
  const path = React.useMemo(() => {
    const result: ELECTION_DETAILS_REQUEST_PATH = `/api/elections/${params.election_id}`;
    return result;
  }, [params]);

  return useApiGetRequest<Election>({
    path,
  });
}

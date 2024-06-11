import * as React from "react";
import { useApiRequest } from "./useApiRequest";
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

  return useApiRequest<null, Election>({
    path,
  });
}

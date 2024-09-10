import { ELECTION_STATUS_REQUEST_PARAMS, ELECTION_STATUS_REQUEST_PATH, ElectionStatusResponse } from "@kiesraad/api";

import { useApiGetRequest } from "./useApiGetRequest";

export function useElectionStatusRequest(params: ELECTION_STATUS_REQUEST_PARAMS) {
  const path: ELECTION_STATUS_REQUEST_PATH = `/api/elections/${params.election_id}/status`;
  return useApiGetRequest<ElectionStatusResponse>(path);
}

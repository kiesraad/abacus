import { ELECTION_STATUS_REQUEST_PATH, ElectionStatusResponse } from "@kiesraad/api";

import { useApiGetRequest } from "./useApiGetRequest";

export function useElectionStatusRequest(electionId: number) {
  const path: ELECTION_STATUS_REQUEST_PATH = `/api/elections/${electionId}/status`;
  return useApiGetRequest<ElectionStatusResponse>(path);
}

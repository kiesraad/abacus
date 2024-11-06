import { ELECTION_STATUS_REQUEST_PATH, ElectionStatusResponse } from "@kiesraad/api";

import { useApiRequest } from "./useApiRequest";

export function useElectionStatusRequest(electionId: number) {
  const path: ELECTION_STATUS_REQUEST_PATH = `/api/elections/${electionId}/status`;
  return useApiRequest<ElectionStatusResponse>(path);
}

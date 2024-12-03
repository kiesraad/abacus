import { ELECTION_STATUS_REQUEST_PATH, ElectionStatusResponse, useApiRequestWithErrors } from "@kiesraad/api";

export function useElectionStatusRequest(electionId: number) {
  const path: ELECTION_STATUS_REQUEST_PATH = `/api/elections/${electionId}/status`;
  return useApiRequestWithErrors<ElectionStatusResponse>(path);
}

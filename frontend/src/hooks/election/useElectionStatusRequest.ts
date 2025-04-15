import { useInitialApiGetWithErrors } from "@/api/useInitialApiGet";
import { ELECTION_STATUS_REQUEST_PATH, ElectionStatusResponse } from "@/types/generated/openapi";

export function useElectionStatusRequest(electionId: number) {
  const path: ELECTION_STATUS_REQUEST_PATH = `/api/elections/${electionId}/status`;
  return useInitialApiGetWithErrors<ElectionStatusResponse>(path);
}

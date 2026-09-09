import { useInitialApiGetWithErrors } from "@/api/useInitialApiGet";
import type { ELECTION_DETAILS_REQUEST_PATH, ElectionDetailsResponse } from "@/types/generated/openapi";

export function useElectionDataRequest(electionId: number) {
  const path: ELECTION_DETAILS_REQUEST_PATH = `/api/elections/${electionId}`;
  return useInitialApiGetWithErrors<ElectionDetailsResponse>(path);
}

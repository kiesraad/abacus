import { useInitialApiGetWithErrors } from "@/api/useInitialApiGet";
import { CommitteeSessionListResponse, ELECTION_COMMITTEE_SESSION_LIST_REQUEST_PATH } from "@/types/generated/openapi";

export function useCommitteeSessionListRequest(electionId: number) {
  const path: ELECTION_COMMITTEE_SESSION_LIST_REQUEST_PATH = `/api/elections/${electionId}/committee_sessions`;
  return useInitialApiGetWithErrors<CommitteeSessionListResponse>(path);
}

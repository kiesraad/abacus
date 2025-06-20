import { useInitialApiGetWithErrors } from "@/api/useInitialApiGet";
import { CommitteeSession, ELECTION_COMMITTEE_SESSION_DETAILS_REQUEST_PATH } from "@/types/generated/openapi";

export function useCommitteeSessionDataRequest(electionId: number) {
  const path: ELECTION_COMMITTEE_SESSION_DETAILS_REQUEST_PATH = `/api/elections/${electionId}/committee_session`;
  return useInitialApiGetWithErrors<CommitteeSession>(path);
}

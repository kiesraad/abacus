import { useInitialApiGetWithErrors } from "@/api/useInitialApiGet";
import type {
  COMMITTEE_SESSION_INVESTIGATIONS_REQUEST_PATH,
  InvestigationListResponse,
} from "@/types/generated/openapi";

export function useCommitteeSessionInvestigationListRequest(electionId: number, committeeSessionId: number) {
  const path: COMMITTEE_SESSION_INVESTIGATIONS_REQUEST_PATH = `/api/elections/${electionId}/committee_sessions/${committeeSessionId}/investigations`;
  return useInitialApiGetWithErrors<InvestigationListResponse>(path);
}

import { useInitialApiGetWithErrors } from "@/api/useInitialApiGet";
import type { SUB_COMMITTEE_CERTIFICATES_REQUEST_PATH, SubCommittee } from "@/types/generated/openapi";

export function useSubCommitteeListRequest(electionId: number) {
  const path: SUB_COMMITTEE_CERTIFICATES_REQUEST_PATH = `/api/elections/${electionId}/sub_committee_certificates`;
  return useInitialApiGetWithErrors<SubCommittee[]>(path);
}

import { useInitialApiGetWithErrors } from "@/api/useInitialApiGet";
import { ELECTION_LIST_REQUEST_PATH, ElectionListResponse } from "@/types/generated/openapi";

export function useElectionListRequest() {
  const path: ELECTION_LIST_REQUEST_PATH = "/api/elections";
  return useInitialApiGetWithErrors<ElectionListResponse>(path);
}

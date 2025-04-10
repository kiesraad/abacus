import { ELECTION_LIST_REQUEST_PATH, ElectionListResponse } from "@/api/gen/openapi";
import { useInitialApiGetWithErrors } from "@/api/useInitialApiGet";

export function useElectionListRequest() {
  const path: ELECTION_LIST_REQUEST_PATH = "/api/elections";
  return useInitialApiGetWithErrors<ElectionListResponse>(path);
}

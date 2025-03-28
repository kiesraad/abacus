import { ELECTION_LIST_REQUEST_PATH, ElectionListResponse, useInitialApiGetWithErrors } from "@/api";

export function useElectionListRequest() {
  const path: ELECTION_LIST_REQUEST_PATH = "/api/elections";
  return useInitialApiGetWithErrors<ElectionListResponse>(path);
}

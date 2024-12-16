import { ELECTION_LIST_REQUEST_PATH, ElectionListResponse, useApiRequestWithErrors } from "@kiesraad/api";

export function useElectionListRequest() {
  const path: ELECTION_LIST_REQUEST_PATH = "/api/elections";
  return useApiRequestWithErrors<ElectionListResponse>(path);
}

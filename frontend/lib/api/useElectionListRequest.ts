import { ELECTION_LIST_REQUEST_PATH, ElectionListResponse } from "@kiesraad/api";

import { useApiRequest } from "./useApiRequest";

export function useElectionListRequest() {
  const path: ELECTION_LIST_REQUEST_PATH = "/api/elections";
  return useApiRequest<ElectionListResponse>(path, false);
}

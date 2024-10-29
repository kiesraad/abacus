import { ELECTION_LIST_REQUEST_PATH, ElectionListResponse } from "@kiesraad/api";

import { useApiGetRequest } from "./useApiRequest";

export function useElectionListRequest() {
  const path: ELECTION_LIST_REQUEST_PATH = "/api/elections";
  return useApiGetRequest<ElectionListResponse>(path);
}

import { ElectionListResponse } from "@kiesraad/api";

import { useApiGetRequest } from "./useApiGetRequest";

export function useElectionListRequest() {
  return useApiGetRequest<ElectionListResponse>(`/api/elections`);
}

import { useApiGetRequest } from "./useApiGetRequest";
import { ElectionListResponse } from "./gen/openapi";

export function useElectionListRequest() {
  return useApiGetRequest<ElectionListResponse>(`/api/elections`);
}

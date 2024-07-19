import { ElectionListResponse } from "./gen/openapi";
import { useApiGetRequest } from "./useApiGetRequest";

export function useElectionListRequest() {
  return useApiGetRequest<ElectionListResponse>(`/api/elections`);
}

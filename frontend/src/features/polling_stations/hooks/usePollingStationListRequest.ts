import { useInitialApiGetWithErrors } from "@/api/useInitialApiGet";
import type { POLLING_STATION_LIST_REQUEST_PATH, PollingStationListResponse } from "@/types/generated/openapi";

export function usePollingStationListRequest(electionId: number) {
  const path: POLLING_STATION_LIST_REQUEST_PATH = `/api/elections/${electionId}/polling_stations`;
  return useInitialApiGetWithErrors<PollingStationListResponse>(path);
}

import { useApiRequestWithErrors } from "@/api";
import { POLLING_STATION_LIST_REQUEST_PATH, PollingStationListResponse } from "@/types/generated/openapi";

export function usePollingStationListRequest(electionId: number) {
  const path: POLLING_STATION_LIST_REQUEST_PATH = `/api/elections/${electionId}/polling_stations`;
  return useApiRequestWithErrors<PollingStationListResponse>(path);
}

import { POLLING_STATION_LIST_REQUEST_PATH, PollingStationListResponse, useInitialApiGetWithErrors } from "@/api";

export function usePollingStationListRequest(electionId: number) {
  const path: POLLING_STATION_LIST_REQUEST_PATH = `/api/elections/${electionId}/polling_stations`;
  return useInitialApiGetWithErrors<PollingStationListResponse>(path);
}

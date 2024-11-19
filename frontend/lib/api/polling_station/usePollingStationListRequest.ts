import { POLLING_STATION_LIST_REQUEST_PATH, PollingStationListResponse, useApiRequest } from "@kiesraad/api";

export function usePollingStationListRequest(electionId: number) {
  const path: POLLING_STATION_LIST_REQUEST_PATH = `/api/elections/${electionId}/polling_stations`;
  return useApiRequest<PollingStationListResponse>(path, false);
}

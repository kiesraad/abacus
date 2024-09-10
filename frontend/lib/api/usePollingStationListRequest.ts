import { POLLING_STATION_LIST_REQUEST_PARAMS, PollingStationListResponse, useApiGetRequest } from "@kiesraad/api";

export function usePollingStationListRequest(params: POLLING_STATION_LIST_REQUEST_PARAMS) {
  return useApiGetRequest<PollingStationListResponse>(`/api/elections/${params.election_id}/polling_stations`);
}

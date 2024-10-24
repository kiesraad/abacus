import {
  POLLING_STATION_LIST_REQUEST_PARAMS,
  POLLING_STATION_LIST_REQUEST_PATH,
  PollingStationListResponse,
  useApiGetRequest,
} from "@kiesraad/api";

export function usePollingStationListRequest(params: POLLING_STATION_LIST_REQUEST_PARAMS) {
  const path: POLLING_STATION_LIST_REQUEST_PATH = `/api/elections/${params.election_id}/polling_stations`;
  return useApiGetRequest<PollingStationListResponse>(path);
}

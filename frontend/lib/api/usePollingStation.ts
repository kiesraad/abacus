import { useApiGetRequest } from "./useApiGetRequest";
import { POLLING_STATION_LIST_REQUEST_PARAMS, PollingStationListResponse } from "./gen/openapi";

export function usePollingStationListRequest(params: POLLING_STATION_LIST_REQUEST_PARAMS) {
  return useApiGetRequest<PollingStationListResponse>(
    `/api/polling_stations/${params.election_id}`,
  );
}
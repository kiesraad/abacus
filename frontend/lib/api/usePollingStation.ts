import { useApiGetRequest } from "./useApiGetRequest";
import { PollingStation, POLLING_STATION_REQUEST_PARAMS } from "./gen/openapi";

export function usePollingStationListRequest(params: POLLING_STATION_REQUEST_PARAMS) {
  return useApiGetRequest<PollingStation>(`/api/polling_stations/${params.election_id}`);
}

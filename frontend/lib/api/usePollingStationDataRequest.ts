import {
  POLLING_STATION_DETAILS_REQUEST_PARAMS,
  POLLING_STATION_DETAILS_REQUEST_PATH,
  PollingStation,
} from "./gen/openapi";
import { useApiGetRequest } from "./useApiGetRequest";

export function usePollingStationDataRequest(params: POLLING_STATION_DETAILS_REQUEST_PARAMS) {
  let path: POLLING_STATION_DETAILS_REQUEST_PATH | "";
  if (params.polling_station_id) {
    path = `/api/polling_stations/${params.polling_station_id}`;
  } else {
    path = "";
  }

  return useApiGetRequest<{ polling_station: PollingStation }>(path);
}

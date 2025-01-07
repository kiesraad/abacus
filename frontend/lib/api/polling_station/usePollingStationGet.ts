import { POLLING_STATION_GET_REQUEST_PATH, useApiRequest, UseApiRequestReturn } from "@kiesraad/api";

import { PollingStation } from "../gen/openapi";

export function usePollingStationGet(
  electionId: number,
  pollingStationId: number,
): UseApiRequestReturn<PollingStation> {
  const path: POLLING_STATION_GET_REQUEST_PATH = `/api/elections/${electionId}/polling_stations/${pollingStationId}`;
  return useApiRequest<PollingStation>(path);
}

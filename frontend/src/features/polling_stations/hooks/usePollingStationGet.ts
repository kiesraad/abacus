import { useApiRequest, UseApiRequestReturn } from "@/api";
import { POLLING_STATION_GET_REQUEST_PATH, PollingStation } from "@/types/generated/openapi";

export function usePollingStationGet(
  electionId: number,
  pollingStationId: number,
): UseApiRequestReturn<PollingStation> {
  const path: POLLING_STATION_GET_REQUEST_PATH = `/api/elections/${electionId}/polling_stations/${pollingStationId}`;
  return useApiRequest<PollingStation>(path);
}

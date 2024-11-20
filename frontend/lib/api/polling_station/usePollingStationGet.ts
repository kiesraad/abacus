import { PollingStation } from "../gen/openapi";
import { useApiRequest, UseLimitedApiRequestReturn } from "../useApiRequest";

export function usePollingStationGet(pollingStationId: number): UseLimitedApiRequestReturn<PollingStation> {
  const path = `/api/polling_stations/${pollingStationId}`;
  return useApiRequest<PollingStation>(path, true);
}

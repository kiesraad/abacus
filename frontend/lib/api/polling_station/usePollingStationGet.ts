import { useApiRequest, UseApiRequestReturn } from "@kiesraad/api";

import { PollingStation } from "../gen/openapi";

export function usePollingStationGet(pollingStationId: number): UseApiRequestReturn<PollingStation> {
  const path = `/api/polling_stations/${pollingStationId}`;
  return useApiRequest<PollingStation>(path);
}

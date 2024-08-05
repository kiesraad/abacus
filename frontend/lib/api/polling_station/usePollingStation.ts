import { useMemo } from "react";

import { usePollingStationList } from "@kiesraad/api";
import { parseIntStrict } from "@kiesraad/util";

export function usePollingStation(pollingStationId: string | undefined) {
  const { pollingStations, pollingStationsLoading } = usePollingStationList();

  const pollingStation = useMemo(() => {
    const parsedStationId = parseIntStrict(pollingStationId ?? "0");
    return pollingStations.find((ps) => ps.id === parsedStationId);
  }, [pollingStationId, pollingStations]);

  return {
    pollingStation,
    loading: pollingStationsLoading,
  };
}

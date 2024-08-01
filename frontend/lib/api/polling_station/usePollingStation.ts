import { useMemo } from "react";

import { usePollingStationList } from "@kiesraad/api";

export function usePollingStation(pollingStationId: string | undefined) {
  const { pollingStations, pollingStationsLoading } = usePollingStationList();

  const pollingStation = useMemo(() => {
    const parsedStationId = parseInt(pollingStationId || "0");
    return pollingStations.find((ps) => ps.id === parsedStationId);
  }, [pollingStationId, pollingStations]);

  return {
    pollingStation,
    loading: pollingStationsLoading,
  };
}

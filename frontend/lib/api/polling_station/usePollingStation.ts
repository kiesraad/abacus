import { useMemo } from "react";

import { PollingStation } from "@kiesraad/api";
import { parsePollingStationNumber } from "@kiesraad/util";

export function usePollingStation(pollingStationId: string | undefined, pollingStations: PollingStation[]) {
  const pollingStation = useMemo(() => {
    const parsedStationId = parsePollingStationNumber(pollingStationId ?? "0");
    return pollingStations.find((ps) => ps.id === parsedStationId);
  }, [pollingStationId, pollingStations]);

  return {
    pollingStation,
  };
}

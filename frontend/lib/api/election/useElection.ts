import * as React from "react";
import { useMemo } from "react";

import { parsePollingStationNumber } from "@kiesraad/util";

import { ElectionProviderContext } from "./ElectionProviderContext";

export function useElection(pollingStationId?: string) {
  const context = React.useContext(ElectionProviderContext);
  if (context === undefined) {
    throw new Error("useElection must be used within an ElectionProvider");
  }
  const pollingStation = useMemo(() => {
    const parsedStationId = parsePollingStationNumber(pollingStationId ?? "0");
    return context.pollingStations.find((ps) => ps.id === parsedStationId);
  }, [pollingStationId, context.pollingStations]);
  return { ...context, pollingStation };
}

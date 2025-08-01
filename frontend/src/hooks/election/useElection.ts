import { useContext } from "react";

import { ElectionProviderContext } from "./ElectionProviderContext";

// fetch the current election, committee session and polling stations from the context
export function useElection(pollingStationId?: number) {
  const context = useContext(ElectionProviderContext);

  if (!context) {
    throw new Error("useElection must be used within an ElectionProvider");
  }

  const { committeeSession, election, pollingStations, refetch } = context;
  const pollingStation = pollingStations.find((ps) => ps.id === pollingStationId);

  return { committeeSession, election, pollingStations, pollingStation, refetch };
}

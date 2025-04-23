import { useContext } from "react";

import { ElectionProviderContext } from "./ElectionProviderContext";

// fetch the current election and polling stations from the context
export function useElection(pollingStationId?: number) {
  const context = useContext(ElectionProviderContext);

  if (!context) {
    throw new Error("useElection must be used within an ElectionProvider");
  }

  const { election, pollingStations } = context;
  const pollingStation = pollingStations.find((ps) => ps.id === pollingStationId);

  return { election, pollingStations, pollingStation };
}

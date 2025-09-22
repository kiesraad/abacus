import { useContext } from "react";

import { ElectionProviderContext } from "./ElectionProviderContext";

// fetch the current election, committee session and polling stations from the context
export function useElection(pollingStationId?: number) {
  const context = useContext(ElectionProviderContext);

  if (!context) {
    throw new Error("useElection must be used within an ElectionProvider");
  }

  const { currentCommitteeSession, committeeSessions, election, pollingStations, investigations, refetch } = context;
  const pollingStation = pollingStations.find((ps) => ps.id === pollingStationId);
  const investigation = pollingStation
    ? investigations.find((psi) => psi.polling_station_id === pollingStation.id)
    : undefined;

  return {
    currentCommitteeSession,
    committeeSessions,
    election,
    pollingStations,
    pollingStation,
    investigations,
    investigation,
    refetch,
  };
}

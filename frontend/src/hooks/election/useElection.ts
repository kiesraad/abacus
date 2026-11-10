import { useContext } from "react";

import { NotFoundError } from "@/api/ApiResult";
import { ElectionProviderContext } from "./ElectionProviderContext";

// fetch the current election, committee session and polling stations from the context
export function useElection(pollingStationId?: number) {
  const context = useContext(ElectionProviderContext);

  if (!context) {
    throw new Error("useElection must be used within an ElectionProvider");
  }

  const {
    currentCommitteeSession,
    committeeSessions,
    election,
    pollingStations,
    investigations,
    showKeypairReminder,
    refetch,
  } = context;
  const pollingStation = pollingStations.find((ps) => ps.id === pollingStationId);
  const investigation = pollingStation
    ? investigations.find((psi) => psi.polling_station_id === pollingStation.id)
    : undefined;

  // If a pollingStationId is provided and no matching polling station was found, throw NotFoundError
  if (pollingStationId !== undefined && !pollingStation) {
    throw new NotFoundError();
  }

  return {
    currentCommitteeSession,
    committeeSessions,
    election,
    pollingStations,
    pollingStation,
    investigations,
    investigation,
    showKeypairReminder,
    refetch,
  };
}

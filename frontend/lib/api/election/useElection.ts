import { NotFoundError } from "app/component/error";

import { parsePollingStationNumber } from "@kiesraad/util";

import { Election, ELECTION_DETAILS_REQUEST_PATH, PollingStation } from "../gen/openapi";
import { useApiGetRequest } from "../useApiGetRequest";

interface ElectionData {
  election: Required<Election> | null;
  pollingStations: PollingStation[] | null;
  pollingStation: PollingStation | null;
}

export function useElection(electionId: number, pollingStationId?: string): ElectionData {
  const path: ELECTION_DETAILS_REQUEST_PATH = `/api/elections/${electionId}`;
  const { data, loading, error } = useApiGetRequest<{
    election: Required<Election>;
    polling_stations: PollingStation[];
  }>(path);

  if (loading) {
    return { election: null, pollingStations: null, pollingStation: null };
  }

  if (!data) {
    throw new NotFoundError("Verkiezing niet gevonden");
  }

  if (error) {
    throw error;
  }

  const election = data.election;
  const pollingStations = data.polling_stations;
  const parsedStationId = parsePollingStationNumber(pollingStationId ?? "0");
  const pollingStation = pollingStations.find((ps) => ps.id === parsedStationId) || null;

  return { election, pollingStations, pollingStation };
}

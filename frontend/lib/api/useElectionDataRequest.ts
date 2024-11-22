import { Election, ELECTION_DETAILS_REQUEST_PATH, PollingStation } from "@kiesraad/api";

import { useApiRequest } from "./useApiRequest";

export function useElectionDataRequest(electionId: number) {
  const path: ELECTION_DETAILS_REQUEST_PATH = `/api/elections/${electionId}`;
  return useApiRequest<{ election: Election; polling_stations: PollingStation[] }>(path, false);
}

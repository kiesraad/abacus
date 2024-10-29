import { Election, ELECTION_DETAILS_REQUEST_PATH, PollingStation } from "@kiesraad/api";

import { useApiGetRequest } from "./useApiGetRequest";

export function useElectionDataRequest(electionId: number) {
  const path: ELECTION_DETAILS_REQUEST_PATH = `/api/elections/${electionId}`;

  return useApiGetRequest<{ election: Election; polling_stations: PollingStation[] }>(path);
}

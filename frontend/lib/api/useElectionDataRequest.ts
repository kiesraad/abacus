import { Election, ELECTION_DETAILS_REQUEST_PATH, PollingStation, useApiRequestWithErrors } from "@kiesraad/api";

export function useElectionDataRequest(electionId: number) {
  const path: ELECTION_DETAILS_REQUEST_PATH = `/api/elections/${electionId}`;
  return useApiRequestWithErrors<{ election: Election; polling_stations: PollingStation[] }>(path);
}

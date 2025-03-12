import { useApiRequestWithErrors } from "@/api";
import { Election, ELECTION_DETAILS_REQUEST_PATH, PollingStation } from "@/types/generated/openapi";

export function useElectionDataRequest(electionId: number) {
  const path: ELECTION_DETAILS_REQUEST_PATH = `/api/elections/${electionId}`;
  return useApiRequestWithErrors<{ election: Election; polling_stations: PollingStation[] }>(path);
}

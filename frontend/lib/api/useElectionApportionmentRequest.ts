import {
  ELECTION_APPORTIONMENT_REQUEST_PATH,
  ElectionApportionmentResponse,
  useApiRequestWithErrors,
} from "@kiesraad/api";

export function useElectionApportionmentRequest(electionId: number) {
  const path: ELECTION_APPORTIONMENT_REQUEST_PATH = `/api/elections/${electionId}/apportionment`;
  return useApiRequestWithErrors<ElectionApportionmentResponse>(path);
}

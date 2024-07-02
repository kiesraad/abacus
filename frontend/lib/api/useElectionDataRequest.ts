import { useApiGetRequest } from "./useApiGetRequest";
import { Election, ELECTION_DETAILS_REQUEST_PARAMS } from "./gen/openapi";

export function useElectionDataRequest(params: ELECTION_DETAILS_REQUEST_PARAMS) {
  return useApiGetRequest<Election>(`/api/elections/${params.election_id}`);
}

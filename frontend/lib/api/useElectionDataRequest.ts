import { useApiGetRequest } from "./useApiGetRequest";
import { Election, ELECTION_DETAILS_REQUEST_PARAMS } from "./gen/openapi";

export function useElectionDataRequest(params: ELECTION_DETAILS_REQUEST_PARAMS) {
  return useApiGetRequest<Election>(
    params.election_id ? `/v1/api/elections/${params.election_id}` : "",
  );
}

import {
  Election,
  ELECTION_DETAILS_REQUEST_PARAMS,
  ELECTION_DETAILS_REQUEST_PATH,
} from "./gen/openapi";
import { useApiGetRequest } from "./useApiGetRequest";

export function useElectionDataRequest(params: ELECTION_DETAILS_REQUEST_PARAMS) {
  let path: ELECTION_DETAILS_REQUEST_PATH | "";
  if (params.election_id) {
    path = `/api/elections/${params.election_id}`;
  } else {
    path = "";
  }

  return useApiGetRequest<{ election: Election }>(path);
}

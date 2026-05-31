import { useInitialApiGet } from "@/api/useInitialApiGet";
import type { ApportionmentState, GET_APPORTIONMENT_STATE_REQUEST_PATH } from "@/types/generated/openapi";

export function useApportionmentStateRequest(electionId: number) {
  const path: GET_APPORTIONMENT_STATE_REQUEST_PATH = `/api/elections/${electionId}/apportionment/state`;
  return useInitialApiGet<ApportionmentState>(path);
}

import { createContext } from "react";

import { ApiResult } from "@/api/ApiResult";
import { CommitteeSession, Election, ElectionListResponse } from "@/types/generated/openapi";

export interface iElectionListProviderContext {
  committeeSessionList: CommitteeSession[];
  electionList: Election[];
  refetch: (controller?: AbortController) => Promise<ApiResult<ElectionListResponse>>;
}

export const ElectionListProviderContext = createContext<iElectionListProviderContext | undefined>(undefined);

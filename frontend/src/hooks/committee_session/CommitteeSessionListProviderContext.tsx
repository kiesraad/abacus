import { createContext } from "react";

import { ApiResult } from "@/api/ApiResult";
import { CommitteeSession, CommitteeSessionListResponse } from "@/types/generated/openapi";

export interface iCommitteeSessionListProviderContext {
  committeeSessions: CommitteeSession[];
  refetch: (controller?: AbortController) => Promise<ApiResult<CommitteeSessionListResponse>>;
}

export const CommitteeSessionListProviderContext = createContext<iCommitteeSessionListProviderContext | null>(null);

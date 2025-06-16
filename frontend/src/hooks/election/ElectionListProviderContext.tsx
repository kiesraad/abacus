import { createContext } from "react";

import { ApiResult } from "@/api/ApiResult";
import { Election, ElectionListResponse } from "@/types/generated/openapi";

export interface iElectionListProviderContext {
  electionList: Election[];
  refetch: (controller?: AbortController) => Promise<ApiResult<ElectionListResponse>>;
}

export const ElectionListProviderContext = createContext<iElectionListProviderContext | undefined>(undefined);

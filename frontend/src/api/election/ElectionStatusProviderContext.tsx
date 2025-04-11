import { createContext } from "react";

import { ApiResult } from "../ApiResult";
import { ElectionStatusResponse, ElectionStatusResponseEntry } from "../gen/openapi";

export interface iElectionStatusProviderContext {
  statuses: Required<ElectionStatusResponseEntry[]>;
  refetch: (controller?: AbortController) => Promise<ApiResult<ElectionStatusResponse>>;
}

export const ElectionStatusProviderContext = createContext<iElectionStatusProviderContext | undefined>(undefined);

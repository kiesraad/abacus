import { createContext } from "react";

import type { ApiResult } from "@/api/ApiResult";
import type { ElectionStatusResponse, ElectionStatusResponseEntry } from "@/types/generated/openapi";

export interface iElectionStatusProviderContext {
  statuses: Required<ElectionStatusResponseEntry[]>;
  refetch: (controller?: AbortController) => Promise<ApiResult<ElectionStatusResponse>>;
}

export const ElectionStatusProviderContext = createContext<iElectionStatusProviderContext | undefined>(undefined);

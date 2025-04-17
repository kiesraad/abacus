import { createContext } from "react";

import { ElectionStatusResponse, ElectionStatusResponseEntry } from "@/types/generated/openapi";

import { ApiResult } from "../ApiResult";

export interface iElectionStatusProviderContext {
  statuses: Required<ElectionStatusResponseEntry[]>;
  refetch: (controller?: AbortController) => Promise<ApiResult<ElectionStatusResponse>>;
}

export const ElectionStatusProviderContext = createContext<iElectionStatusProviderContext | undefined>(undefined);

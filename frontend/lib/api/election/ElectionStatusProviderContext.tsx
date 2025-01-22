import { createContext } from "react";

import { ApiResult, ElectionStatusResponse, ElectionStatusResponseEntry } from "@kiesraad/api";

export interface iElectionStatusProviderContext {
  statuses: Required<ElectionStatusResponseEntry[]>;
  refetch: (controller?: AbortController) => Promise<ApiResult<ElectionStatusResponse>>;
}

export const ElectionStatusProviderContext = createContext<iElectionStatusProviderContext | undefined>(undefined);

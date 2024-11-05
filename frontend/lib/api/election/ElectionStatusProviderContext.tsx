import { createContext } from "react";

import { ApiResult, ElectionStatusResponse, PollingStationStatusEntry } from "@kiesraad/api";

export interface iElectionStatusProviderContext {
  statuses: Required<PollingStationStatusEntry[]>;
  refetch: (controller?: AbortController) => Promise<ApiResult<ElectionStatusResponse>>;
}

export const ElectionStatusProviderContext = createContext<iElectionStatusProviderContext | undefined>(undefined);

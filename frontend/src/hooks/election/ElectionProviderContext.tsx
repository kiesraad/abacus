import { createContext } from "react";

import { ApiResult } from "@/api/ApiResult";
import {
  CommitteeSession,
  ElectionDetailsResponse,
  ElectionWithPoliticalGroups,
  PollingStation,
} from "@/types/generated/openapi";

export interface iElectionProviderContext {
  committeeSession: CommitteeSession;
  election: ElectionWithPoliticalGroups;
  pollingStations: Required<PollingStation[]>;
  refetch: (controller?: AbortController) => Promise<ApiResult<ElectionDetailsResponse>>;
}

export const ElectionProviderContext = createContext<iElectionProviderContext | undefined>(undefined);

import { createContext } from "react";

import { ApiResult } from "@/api/ApiResult";
import {
  CommitteeSession,
  ElectionDetailsResponse,
  ElectionWithPoliticalGroups,
  PollingStation,
  PollingStationInvestigation,
} from "@/types/generated/openapi";

export interface iElectionProviderContext {
  currentCommitteeSession: CommitteeSession;
  committeeSessions: CommitteeSession[];
  election: ElectionWithPoliticalGroups;
  pollingStations: Required<PollingStation[]>;
  investigations: PollingStationInvestigation[];
  refetch: (controller?: AbortController) => Promise<ApiResult<ElectionDetailsResponse>>;
}

export const ElectionProviderContext = createContext<iElectionProviderContext | undefined>(undefined);

import { createContext } from "react";

import type { ApiResult } from "@/api/ApiResult";
import type {
  CommitteeSession,
  ElectionDetailsResponse,
  ElectionWithPoliticalGroups,
  KeypairReminder,
  PollingStation,
  PollingStationInvestigation,
} from "@/types/generated/openapi";

export interface iElectionProviderContext {
  currentCommitteeSession: CommitteeSession;
  committeeSessions: CommitteeSession[];
  election: ElectionWithPoliticalGroups;
  pollingStations: Required<PollingStation[]>;
  investigations: PollingStationInvestigation[];
  showKeypairReminder?: KeypairReminder;
  refetch: (controller?: AbortController) => Promise<ApiResult<ElectionDetailsResponse>>;
}

export const ElectionProviderContext = createContext<iElectionProviderContext | undefined>(undefined);

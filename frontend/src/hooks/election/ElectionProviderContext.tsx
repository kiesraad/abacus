import { createContext } from "react";

import { CommitteeSession, ElectionWithPoliticalGroups, PollingStation } from "@/types/generated/openapi";

export interface iElectionProviderContext {
  committeeSession: CommitteeSession;
  election: ElectionWithPoliticalGroups;
  pollingStations: Required<PollingStation[]>;
}

export const ElectionProviderContext = createContext<iElectionProviderContext | null>(null);

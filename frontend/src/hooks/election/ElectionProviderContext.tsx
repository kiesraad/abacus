import { createContext } from "react";

import { ElectionWithPoliticalGroups, PollingStation } from "@/types/generated/openapi";

export interface iElectionProviderContext {
  election: ElectionWithPoliticalGroups;
  pollingStations: Required<PollingStation[]>;
}

export const ElectionProviderContext = createContext<iElectionProviderContext | null>(null);

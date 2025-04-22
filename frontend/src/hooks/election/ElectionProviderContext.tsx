import { createContext } from "react";

import { Election, PollingStation } from "@/types/generated/openapi";

export interface iElectionProviderContext {
  election: Required<Election>;
  pollingStations: Required<PollingStation[]>;
}

export const ElectionProviderContext = createContext<iElectionProviderContext | null>(null);

import { createContext } from "react";

import { Election, PollingStation } from "@kiesraad/api";

export interface iElectionProviderContext {
  election: Required<Election>;
  pollingStations: Required<PollingStation[]>;
}

export const ElectionProviderContext = createContext<iElectionProviderContext | undefined>(undefined);

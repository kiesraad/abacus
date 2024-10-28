import { createContext } from "react";

import { PollingStationStatusEntry } from "@kiesraad/api";

export interface iElectionStatusProviderContext {
  statuses: Required<PollingStationStatusEntry[]>;
  refetch: () => void;
}

export const ElectionStatusProviderContext = createContext<iElectionStatusProviderContext | undefined>(undefined);

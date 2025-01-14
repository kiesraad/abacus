import { ReactNode } from "react";

import { Election } from "@kiesraad/api";

import { DataEntryContext } from "./DataEntryContext";
import useDataEntry from "./useDataEntry";

export interface DataEntryProviderProps {
  election: Required<Election>;
  pollingStationId: number;
  entryNumber: number;
  children: ReactNode;
}

export function DataEntryProvider({ election, pollingStationId, entryNumber, children }: DataEntryProviderProps) {
  const stateAndActions = useDataEntry(election, pollingStationId, entryNumber);

  return <DataEntryContext.Provider value={{ ...stateAndActions }}>{children}</DataEntryContext.Provider>;
}

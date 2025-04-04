import { ReactNode } from "react";

import { Election } from "@/api";

import { DataEntryStateAndActionsLoaded } from "../types/types";
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

  if (!stateAndActions.pollingStationResults) {
    return null;
  }

  return (
    <DataEntryContext.Provider value={{ ...stateAndActions } as DataEntryStateAndActionsLoaded}>
      {children}
    </DataEntryContext.Provider>
  );
}

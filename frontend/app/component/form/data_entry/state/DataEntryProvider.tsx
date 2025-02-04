import { ReactNode } from "react";

import { Election } from "@kiesraad/api";

import { DataEntryContext } from "./DataEntryContext";
import { DataEntryState, DataEntryStateAndActionsLoaded } from "./types";
import useDataEntry from "./useDataEntry";

export interface DataEntryProviderProps {
  election: Required<Election>;
  pollingStationId: number;
  entryNumber: number;
  children: ReactNode;
  overrideState?: DataEntryState;
}

export function DataEntryProvider({
  election,
  pollingStationId,
  entryNumber,
  children,
  overrideState,
}: DataEntryProviderProps) {
  const stateAndActions = useDataEntry(election, pollingStationId, entryNumber, overrideState);

  if (!stateAndActions.pollingStationResults) {
    return null;
  }

  return (
    <DataEntryContext.Provider value={{ ...stateAndActions } as DataEntryStateAndActionsLoaded}>
      {children}
    </DataEntryContext.Provider>
  );
}

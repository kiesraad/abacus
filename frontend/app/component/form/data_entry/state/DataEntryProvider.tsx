import { createContext, ReactNode } from "react";
import { DataEntryStateAndActions } from "./types";
import useDataEntry from "./useDataEntry";
import { Election } from "@kiesraad/api";
export const DataEntryContext = createContext<DataEntryStateAndActions | null>(null);

export interface DataEntryProviderProps {
    election: Required<Election>;
    pollingStationId: number;
    entryNumber: number;
  children: ReactNode;
}

export function DataEntryProvider({
  election,
  pollingStationId,
  entryNumber,
  children,
}: DataEntryProviderProps) {
  const stateAndActions = useDataEntry(election, pollingStationId, entryNumber);

  return (
    <DataEntryContext.Provider value={{ ...stateAndActions }}>
      {children}
    </DataEntryContext.Provider>
  );
}

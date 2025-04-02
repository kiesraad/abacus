import { ReactNode, useEffect } from "react";
import { useNavigate } from "react-router";

import { Election } from "@kiesraad/api";

import { DataEntryContext } from "./DataEntryContext";
import { DataEntryStateAndActionsLoaded } from "./types";
import useDataEntry from "./useDataEntry";

export interface DataEntryProviderProps {
  election: Required<Election>;
  pollingStationId: number;
  entryNumber: number;
  children: ReactNode;
}

export function DataEntryProvider({ election, pollingStationId, entryNumber, children }: DataEntryProviderProps) {
  const navigate = useNavigate();
  const stateAndActions = useDataEntry(election, pollingStationId, entryNumber);

  // handle error
  useEffect(() => {
    if (stateAndActions.error) {
      void navigate(`/elections/${election.id}/data-entry?error=data_entry_error`);
    }
  }, [election.id, navigate, stateAndActions.error]);

  if (!stateAndActions.pollingStationResults) {
    return null;
  }

  return (
    <DataEntryContext.Provider value={{ ...stateAndActions } as DataEntryStateAndActionsLoaded}>
      {children}
    </DataEntryContext.Provider>
  );
}

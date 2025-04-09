import { ReactNode, useEffect } from "react";
import { useNavigate } from "react-router";

import { Election } from "@/api";

import { DataEntryContext } from "../hooks/DataEntryContext";
import useDataEntry from "../hooks/useDataEntry";
import { DataEntryStateAndActionsLoaded } from "../types/types";

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

import { ReactNode, useEffect } from "react";
import { useNavigate } from "react-router";

import { ApiError } from "@/api/ApiResult";
import { Election } from "@/api/gen/openapi";

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
    if (
      stateAndActions.error &&
      stateAndActions.error instanceof ApiError &&
      stateAndActions.error.reference === "DataEntryAlreadyClaimed"
    ) {
      void navigate(`/elections/${election.id}/data-entry#data-entry-claimed-${pollingStationId}`);
    }
  }, [election.id, navigate, stateAndActions.error, pollingStationId]);

  if (!stateAndActions.pollingStationResults) {
    return null;
  }

  return (
    <DataEntryContext.Provider value={{ ...stateAndActions } as DataEntryStateAndActionsLoaded}>
      {children}
    </DataEntryContext.Provider>
  );
}

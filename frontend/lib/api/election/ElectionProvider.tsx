import * as React from "react";

import { Election, PollingStation, useElectionDataRequest } from "@kiesraad/api";

export interface iElectionProviderContext {
  election: Required<Election>;
  pollingStations: Required<PollingStation[]>;
}

export const ElectionProviderContext = React.createContext<iElectionProviderContext | undefined>(undefined);

export interface ElectionProviderProps {
  children: React.ReactNode;
  electionId: number;
}

export function ElectionProvider({ children, electionId }: ElectionProviderProps) {
  const { data, loading, error } = useElectionDataRequest({
    election_id: electionId,
  });

  if (loading) {
    return null;
  }

  if (!data) {
    throw new Error("Election not found");
  }

  if (error) {
    throw error;
  }

  return (
    <ElectionProviderContext.Provider
      value={{ election: data.election as Required<Election>, pollingStations: data.polling_stations }}
    >
      {children}
    </ElectionProviderContext.Provider>
  );
}

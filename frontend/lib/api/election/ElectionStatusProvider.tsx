import * as React from "react";

import { PollingStationStatusEntry, useElectionStatusRequest } from "@kiesraad/api";

export interface iElectionStatusProviderContext {
  statuses: Required<PollingStationStatusEntry[]>;
}

export const ElectionStatusProviderContext = React.createContext<
  iElectionStatusProviderContext | undefined
>(undefined);

export interface ElectionStatusProviderProps {
  children: React.ReactNode;
  electionId: number;
}

export function ElectionStatusProvider({ children, electionId }: ElectionStatusProviderProps) {
  const { data, loading, error } = useElectionStatusRequest({
    election_id: electionId,
  });

  if (loading) {
    return null;
  }

  if (!data || error) {
    throw new Error();
  }

  return (
    <ElectionStatusProviderContext.Provider value={{ statuses: data.statuses }}>
      {children}
    </ElectionStatusProviderContext.Provider>
  );
}

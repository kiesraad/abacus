import * as React from "react";

import { NotFoundError } from "app/component/error";

import { PollingStationStatusEntry, useElectionStatusRequest } from "@kiesraad/api";

export interface iElectionStatusProviderContext {
  statuses: Required<PollingStationStatusEntry[]>;
  refetch: () => void;
}

export const ElectionStatusProviderContext = React.createContext<iElectionStatusProviderContext | undefined>(undefined);

export interface ElectionStatusProviderProps {
  children: React.ReactNode;
  electionId: number;
}

export function ElectionStatusProvider({ children, electionId }: ElectionStatusProviderProps) {
  const { data, error, refetch } = useElectionStatusRequest({
    election_id: electionId,
  });

  if (error && error.code === 404) {
    throw new NotFoundError("Er ging iets mis bij het ophalen van de verkiezing");
  }

  if (error) {
    throw error;
  }

  if (data === null) {
    return null;
  }

  return (
    <ElectionStatusProviderContext.Provider value={{ statuses: data.statuses, refetch }}>
      {children}
    </ElectionStatusProviderContext.Provider>
  );
}

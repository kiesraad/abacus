import * as React from "react";

import { NotFoundError } from "app/component/error";

import { Election, useElectionDataRequest } from "@kiesraad/api";

import { ElectionProviderContext } from "./ElectionProviderContext";

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
    throw new NotFoundError("Verkiezing niet gevonden");
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

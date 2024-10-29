import * as React from "react";

import { NotFoundError } from "app/component/error";

import { Election, useElectionDataRequest } from "@kiesraad/api";

import { ElectionProviderContext } from "./ElectionProviderContext";

export interface ElectionProviderProps {
  children: React.ReactNode;
  electionId: number;
}

export function ElectionProvider({ children, electionId }: ElectionProviderProps) {
  const { state } = useElectionDataRequest(electionId);

  if (state.status === "loading") {
    return null;
  }

  if (state.status === "api-error") {
    if (state.error.code === 404) {
      throw new NotFoundError("Verkiezing niet gevonden");
    }

    throw state.error;
  }

  if (state.status === "network-error") {
    throw state.error;
  }

  return (
    <ElectionProviderContext.Provider
      value={{
        election: state.data.election as Required<Election>,
        pollingStations: state.data.polling_stations,
      }}
    >
      {children}
    </ElectionProviderContext.Provider>
  );
}

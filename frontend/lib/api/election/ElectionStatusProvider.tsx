import * as React from "react";

import { NotFoundError } from "app/component/error";

import { useElectionStatusRequest } from "@kiesraad/api";

import { ElectionStatusProviderContext } from "./ElectionStatusProviderContext";

export interface ElectionStatusProviderProps {
  children: React.ReactNode;
  electionId: number;
}

export function ElectionStatusProvider({ children, electionId }: ElectionStatusProviderProps) {
  const { requestState, refetch } = useElectionStatusRequest(electionId);

  if (requestState.status === "loading") {
    return null;
  }

  if (requestState.status === "api-error") {
    if (requestState.error.code === 404) {
      throw new NotFoundError("Er ging iets mis bij het ophalen van de verkiezing");
    }

    throw requestState.error;
  }

  if (requestState.status === "network-error") {
    throw requestState.error;
  }

  return (
    <ElectionStatusProviderContext.Provider value={{ statuses: requestState.data.statuses, refetch }}>
      {children}
    </ElectionStatusProviderContext.Provider>
  );
}

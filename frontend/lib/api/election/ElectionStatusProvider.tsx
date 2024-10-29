import * as React from "react";

import { NotFoundError } from "app/component/error";

import { useElectionStatusRequest } from "@kiesraad/api";

import { ElectionStatusProviderContext } from "./ElectionStatusProviderContext";

export interface ElectionStatusProviderProps {
  children: React.ReactNode;
  electionId: number;
}

export function ElectionStatusProvider({ children, electionId }: ElectionStatusProviderProps) {
  const { state, refetch } = useElectionStatusRequest(electionId);

  if (state.status === "loading") {
    return null;
  }

  if (state.status === "api-error") {
    if (state.error.code === 404) {
      throw new NotFoundError("Er ging iets mis bij het ophalen van de verkiezing");
    }

    throw state.error;
  }

  if (state.status === "network-error") {
    throw state.error;
  }

  return (
    <ElectionStatusProviderContext.Provider value={{ statuses: state.data.statuses, refetch }}>
      {children}
    </ElectionStatusProviderContext.Provider>
  );
}

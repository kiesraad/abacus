import * as React from "react";

import { NotFoundError } from "app/component/error";

import { useElectionStatusRequest } from "@kiesraad/api";

import { ElectionStatusProviderContext } from "./ElectionStatusProviderContext";

export interface ElectionStatusProviderProps {
  children: React.ReactNode;
  electionId: number;
}

export function ElectionStatusProvider({ children, electionId }: ElectionStatusProviderProps) {
  const { data, error, refetch } = useElectionStatusRequest(electionId);

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

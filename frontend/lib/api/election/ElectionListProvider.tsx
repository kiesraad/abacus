import * as React from "react";

import { NotFoundError } from "app/component/error";

import { Election, useElectionListRequest } from "@kiesraad/api";

export interface iElectionListProviderContext {
  electionList: Election[];
}

export const ElectionListProviderContext = React.createContext<iElectionListProviderContext | undefined>(undefined);

export interface ElectionListProviderProps {
  children: React.ReactNode;
}

export function ElectionListProvider({ children }: ElectionListProviderProps) {
  const { data, loading } = useElectionListRequest();

  if (loading) {
    return null;
  }

  if (!data || !data.elections.length) {
    throw new NotFoundError("No elections found");
  }

  return (
    <ElectionListProviderContext.Provider value={{ electionList: data.elections }}>
      {children}
    </ElectionListProviderContext.Provider>
  );
}

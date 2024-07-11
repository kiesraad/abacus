import * as React from "react";
import { Election } from "../gen/openapi";
import { useElectionListRequest } from "../useElectionListRequest";

export interface iElectionListProviderContext {
  electionList: Election[];
}

export const ElectionListProviderContext = React.createContext<
  iElectionListProviderContext | undefined
>(undefined);

export interface ElectionListProviderProps {
  children: React.ReactNode;
}

export function ElectionListProvider({ children }: ElectionListProviderProps) {
  const { data, loading } = useElectionListRequest();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!data || !data.elections.length) {
    return <div>Error no election data</div>;
  }

  return (
    <ElectionListProviderContext.Provider value={{ electionList: data.elections }}>
      {children}
    </ElectionListProviderContext.Provider>
  );
}

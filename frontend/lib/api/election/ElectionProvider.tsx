import * as React from "react";
import { Election } from "../gen/openapi";
import { useElectionListRequest } from "../useElectionListRequest";

export interface iElectionProviderContext {
  elections: Election[];
  activeElection: Election;
}

export const ElectionProviderContext = React.createContext<iElectionProviderContext | undefined>(
  undefined,
);

export interface ElectionProviderProps {
  children: React.ReactNode;
}

export function ElectionProvider({ children }: ElectionProviderProps) {
  const { data, loading } = useElectionListRequest();
  console.log("HUH", data);
  if (loading) {
    return <div>Loading...</div>;
  }

  if (!data || !data.elections.length) {
    return <div>Error no election data</div>;
  }

  // Temporary: just use the first election as the active one
  const activeElection = data.elections[0] as Election;

  return (
    <ElectionProviderContext.Provider value={{ elections: data.elections, activeElection }}>
      {children}
    </ElectionProviderContext.Provider>
  );
}

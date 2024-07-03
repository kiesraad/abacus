import * as React from "react";
import { Election } from "../gen/openapi";
import { useElectionDataRequest } from "../useElectionDataRequest";
import { useElectionList } from "./useElectionList";

export interface iElectionProviderContext {
  election: Election;
}

export const ElectionProviderContext = React.createContext<iElectionProviderContext | undefined>(
  undefined,
);

export interface ElectionProviderProps {
  children: React.ReactNode;
}

export function ElectionProvider({ children }: ElectionProviderProps) {
  const { electionList } = useElectionList();

  const { data, loading } = useElectionDataRequest({
    election_id: electionList.length && electionList[0] ? electionList[0].id : 0,
  });

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!data) {
    return <div>Error no election data</div>;
  }

  return (
    <ElectionProviderContext.Provider value={{ election: data }}>
      {children}
    </ElectionProviderContext.Provider>
  );
}

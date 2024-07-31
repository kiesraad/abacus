import * as React from "react";

import { Election, useElectionDataRequest } from "@kiesraad/api";

export interface iElectionProviderContext {
  election: Required<Election>;
}

export const ElectionProviderContext = React.createContext<iElectionProviderContext | undefined>(
  undefined,
);

export interface ElectionProviderProps {
  children: React.ReactNode;
  electionId: number;
}

export function ElectionProvider({ children, electionId }: ElectionProviderProps) {
  const { data, loading } = useElectionDataRequest({
    election_id: electionId,
  });

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!data) {
    return <div>Error no election data</div>;
  }

  return (
    <ElectionProviderContext.Provider value={{ election: data.election as Required<Election> }}>
      {children}
    </ElectionProviderContext.Provider>
  );
}

import * as React from "react";

import { useElectionStatusRequest } from "@kiesraad/api";

import RequestStateHandler from "../RequestStateHandler";
import { ElectionStatusProviderContext } from "./ElectionStatusProviderContext";

export interface ElectionStatusProviderProps {
  children: React.ReactNode;
  electionId: number;
}

export function ElectionStatusProvider({ children, electionId }: ElectionStatusProviderProps) {
  const { requestState, refetch } = useElectionStatusRequest(electionId);

  return (
    <RequestStateHandler
      requestState={requestState}
      notFoundMessage="error.election_not_found"
      renderOnSuccess={(data) => (
        <ElectionStatusProviderContext.Provider value={{ statuses: data.statuses, refetch }}>
          {children}
        </ElectionStatusProviderContext.Provider>
      )}
    />
  );
}

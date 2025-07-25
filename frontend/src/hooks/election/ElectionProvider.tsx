import * as React from "react";

import RequestStateHandler from "@/api/RequestStateHandler";

import { ElectionProviderContext } from "./ElectionProviderContext";
import { useElectionDataRequest } from "./useElectionDataRequest";

export interface ElectionProviderProps {
  children: React.ReactNode;
  electionId: number;
}

export function ElectionProvider({ children, electionId }: ElectionProviderProps) {
  const { requestState, refetch } = useElectionDataRequest(electionId);

  return (
    <RequestStateHandler
      requestState={requestState}
      notFoundMessage="error.election_not_found"
      isFoundCheck={(data) => typeof data.election === "object"}
      renderOnSuccess={(data) => (
        <ElectionProviderContext.Provider
          value={{
            committeeSession: data.committee_session,
            election: data.election,
            pollingStations: data.polling_stations,
            refetch,
          }}
        >
          {children}
        </ElectionProviderContext.Provider>
      )}
    />
  );
}

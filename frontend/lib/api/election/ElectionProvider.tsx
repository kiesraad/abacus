import * as React from "react";

import { Election, useElectionDataRequest } from "@kiesraad/api";

import RequestStateHandler from "../RequestStateHandler";
import { ElectionProviderContext } from "./ElectionProviderContext";

export interface ElectionProviderProps {
  children: React.ReactNode;
  electionId: number;
}

export function ElectionProvider({ children, electionId }: ElectionProviderProps) {
  const { requestState } = useElectionDataRequest(electionId);

  return (
    <RequestStateHandler
      requestState={requestState}
      notFoundMessage="error.election_not_found"
      renderOnSuccess={(data) => (
        <ElectionProviderContext.Provider
          value={{
            election: data.election as Required<Election>,
            pollingStations: data.polling_stations,
          }}
        >
          {children}
        </ElectionProviderContext.Provider>
      )}
    />
  );
}

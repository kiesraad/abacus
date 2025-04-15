import * as React from "react";

import { Election } from "@/types/generated/openapi";

import RequestStateHandler from "../RequestStateHandler";
import { useElectionDataRequest } from "../useElectionDataRequest";
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
      isFoundCheck={(data) => typeof data.election === "object"}
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

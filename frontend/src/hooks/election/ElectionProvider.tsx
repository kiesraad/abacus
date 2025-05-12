import * as React from "react";

import RequestStateHandler from "@/api/RequestStateHandler";
import { Election } from "@/types/generated/openapi";

import { ElectionProviderContext } from "./ElectionProviderContext";
import { useElectionDataRequest } from "./useElectionDataRequest";

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
            // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
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

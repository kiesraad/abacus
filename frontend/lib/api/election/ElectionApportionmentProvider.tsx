import * as React from "react";

import RequestStateHandler from "../RequestStateHandler";
import { useElectionApportionmentRequest } from "../useElectionApportionmentRequest";
import { ElectionApportionmentProviderContext } from "./ElectionApportionmentProviderContext";

export interface ElectionApportionmentProviderProps {
  children: React.ReactNode;
  electionId: number;
}

export function ElectionApportionmentProvider({ children, electionId }: ElectionApportionmentProviderProps) {
  const { requestState, refetch } = useElectionApportionmentRequest(electionId);

  return (
    <RequestStateHandler
      requestState={requestState}
      notFoundMessage="error.election_not_found"
      renderOnSuccess={(data) => (
        <ElectionApportionmentProviderContext.Provider
          value={{ apportionment: data.apportionment, election_summary: data.election_summary, refetch }}
        >
          {children}
        </ElectionApportionmentProviderContext.Provider>
      )}
    />
  );
}

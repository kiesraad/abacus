import * as React from "react";

import RequestStateHandler from "../RequestStateHandler";
import { useApportionmentRequest } from "../useApportionmentRequest";
import { ApportionmentProviderContext } from "./ApportionmentProviderContext";

export interface ElectionApportionmentProviderProps {
  children: React.ReactNode;
  electionId: number;
}

export function ApportionmentProvider({ children, electionId }: ElectionApportionmentProviderProps) {
  const { requestState } = useApportionmentRequest(electionId);

  return (
    <RequestStateHandler
      requestState={requestState}
      notFoundMessage="error.election_not_found"
      renderOnSuccess={(data) => (
        <ApportionmentProviderContext.Provider
          value={{ apportionment: data.apportionment, election_summary: data.election_summary, requestState }}
        >
          {children}
        </ApportionmentProviderContext.Provider>
      )}
    />
  );
}

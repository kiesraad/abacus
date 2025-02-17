import * as React from "react";

import { isFatalError } from "../ApiError";
import { ApportionmentProviderContext } from "./ApportionmentProviderContext";
import { useApportionmentRequest } from "./useApportionmentRequest";

export interface ElectionApportionmentProviderProps {
  children: React.ReactNode;
  electionId: number;
}

export function ApportionmentProvider({ children, electionId }: ElectionApportionmentProviderProps) {
  const { apiError, data } = useApportionmentRequest(electionId);

  if (apiError && isFatalError(apiError)) {
    throw apiError;
  }

  return (
    <ApportionmentProviderContext.Provider
      value={{
        apportionment: data?.apportionment,
        electionSummary: data?.election_summary,
        error: apiError,
      }}
    >
      {children}
    </ApportionmentProviderContext.Provider>
  );
}

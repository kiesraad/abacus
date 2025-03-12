import * as React from "react";

import { isFatalError } from "@kiesraad/api";

import { ApportionmentProviderContext } from "./ApportionmentProviderContext";
import { useApportionmentRequest } from "./useApportionmentRequest";

export interface ElectionApportionmentProviderProps {
  children: React.ReactNode;
  electionId: number;
}

export function ApportionmentProvider({ children, electionId }: ElectionApportionmentProviderProps) {
  const { error, data } = useApportionmentRequest(electionId);

  if (error && isFatalError(error)) {
    throw error;
  }

  return (
    <ApportionmentProviderContext.Provider
      value={{
        apportionment: data?.apportionment,
        electionSummary: data?.election_summary,
        error,
      }}
    >
      {children}
    </ApportionmentProviderContext.Provider>
  );
}

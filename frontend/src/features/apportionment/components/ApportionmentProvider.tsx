import * as React from "react";

import { isFatalError } from "@/api/ApiResult";

import { ApportionmentProviderContext } from "../hooks/ApportionmentProviderContext";
import { useApportionmentRequest } from "../hooks/useApportionmentRequest";

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
        seatAssignment: data?.seat_assignment,
        candidateNomination: data?.candidate_nomination,
        electionSummary: data?.election_summary,
        error,
      }}
    >
      {children}
    </ApportionmentProviderContext.Provider>
  );
}

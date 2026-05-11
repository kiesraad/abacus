import type * as React from "react";

import { ApiError } from "@/api/ApiResult";

import { useApportionmentStateRequest } from "../../../hooks/apportionment/useApportionmentStateRequest";
import { ApportionmentProviderContext } from "../hooks/ApportionmentProviderContext";
import { useApportionmentRequest } from "../hooks/useApportionmentRequest";

export interface ElectionApportionmentProviderProps {
  children: React.ReactNode;
  electionId: number;
}

export function ApportionmentProvider({ children, electionId }: ElectionApportionmentProviderProps) {
  const { error: apportionmentError, data } = useApportionmentRequest(electionId);
  const { error: stateError, data: state } = useApportionmentStateRequest(electionId);

  const error = apportionmentError || stateError;
  if (error && !(error instanceof ApiError)) {
    throw error;
  }

  return (
    <ApportionmentProviderContext.Provider
      value={{
        seatAssignment: data?.seat_assignment,
        candidateNomination: data?.candidate_nomination,
        electionSummary: data?.election_summary,
        state,
        error,
      }}
    >
      {children}
    </ApportionmentProviderContext.Provider>
  );
}

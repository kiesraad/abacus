import type * as React from "react";

import { ApiError } from "@/api/ApiResult";
import { useApportionmentStateRequest } from "@/hooks/apportionment/useApportionmentStateRequest";
import type { ApportionmentState } from "@/types/generated/openapi";
import { ApportionmentProviderContext } from "../hooks/ApportionmentProviderContext";
import { useApportionmentRequest } from "../hooks/useApportionmentRequest";

export interface ElectionApportionmentProviderProps {
  children: React.ReactNode;
  electionId: number;
}

export function ApportionmentProvider({ children, electionId }: ElectionApportionmentProviderProps) {
  const { error: apportionmentError, data } = useApportionmentRequest(electionId);
  const { requestState, refetch } = useApportionmentStateRequest(electionId);
  let error = apportionmentError;
  let state: ApportionmentState | undefined;
  if (requestState.status === "success") {
    state = requestState.data;
  } else if (requestState.status === "api-error") {
    error = requestState.error;
  }
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
        isLoading: requestState.status === "loading",
        refetchState: refetch,
      }}
    >
      {children}
    </ApportionmentProviderContext.Provider>
  );
}

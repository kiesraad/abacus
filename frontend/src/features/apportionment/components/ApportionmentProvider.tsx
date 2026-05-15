import type * as React from "react";

import { ApiError } from "@/api/ApiResult";
import RequestStateHandler from "@/api/RequestStateHandler";
import { useApportionmentStateRequest } from "@/hooks/apportionment/useApportionmentStateRequest";
import { ApportionmentProviderContext } from "../hooks/ApportionmentProviderContext";
import { useApportionmentRequest } from "../hooks/useApportionmentRequest";

export interface ElectionApportionmentProviderProps {
  children: React.ReactNode;
  electionId: number;
}

export function ApportionmentProvider({ children, electionId }: ElectionApportionmentProviderProps) {
  const { error: apportionmentError, data } = useApportionmentRequest(electionId);
  const { requestState, refetch } = useApportionmentStateRequest(electionId);
  // TODO: Check if this is now correct, it does work now
  const error = apportionmentError;
  if (error && !(error instanceof ApiError)) {
    throw error;
  }

  return (
    <RequestStateHandler
      requestState={requestState}
      notFoundMessage="error.not_found"
      renderOnSuccess={(state) => (
        <ApportionmentProviderContext.Provider
          value={{
            seatAssignment: data?.seat_assignment,
            candidateNomination: data?.candidate_nomination,
            electionSummary: data?.election_summary,
            state,
            error,
            refetch,
          }}
        >
          {children}
        </ApportionmentProviderContext.Provider>
      )}
    />
  );
}

import { createContext } from "react";

import { ApiError } from "@/api/ApiResult";
import { CandidateNominationResult, ElectionSummary, SeatAssignmentResult } from "@/api/gen/openapi";

export interface iElectionApportionmentProviderContext {
  seatAssignment?: SeatAssignmentResult;
  candidateNomination?: CandidateNominationResult;
  electionSummary?: ElectionSummary;
  error?: ApiError;
}

export const ApportionmentProviderContext = createContext<iElectionApportionmentProviderContext | undefined>(undefined);

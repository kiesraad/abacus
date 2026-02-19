import { createContext } from "react";

import type { ApiError } from "@/api/ApiResult";
import type { CandidateNominationResult, ElectionSummary, SeatAssignmentResult } from "@/types/generated/openapi";

export interface iElectionApportionmentProviderContext {
  seatAssignment?: SeatAssignmentResult;
  candidateNomination?: CandidateNominationResult;
  electionSummary?: ElectionSummary;
  error?: ApiError;
}

export const ApportionmentProviderContext = createContext<iElectionApportionmentProviderContext | undefined>(undefined);

import { createContext } from "react";

import { ApiError, CandidateNominationResult, ElectionSummary, SeatAssignmentResult } from "@/api";

export interface iElectionApportionmentProviderContext {
  seatAssignment?: SeatAssignmentResult;
  candidateNomination?: CandidateNominationResult;
  electionSummary?: ElectionSummary;
  error?: ApiError;
}

export const ApportionmentProviderContext = createContext<iElectionApportionmentProviderContext | undefined>(undefined);

import { createContext } from "react";

import type { ApiError } from "@/api/ApiResult";
import type { CandidateNomination, ElectionSummary, SeatAssignment } from "@/types/generated/openapi";

export interface iElectionApportionmentProviderContext {
  seatAssignment?: SeatAssignment;
  candidateNomination?: CandidateNomination;
  electionSummary?: ElectionSummary;
  error?: ApiError;
}

export const ApportionmentProviderContext = createContext<iElectionApportionmentProviderContext | undefined>(undefined);

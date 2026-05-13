import { createContext } from "react";

import type { ApiError } from "@/api/ApiResult";
import type {
  ApportionmentState,
  CandidateNomination,
  ElectionSummary,
  SeatAssignment,
} from "@/types/generated/openapi";

export interface iElectionApportionmentProviderContext {
  seatAssignment?: SeatAssignment;
  candidateNomination?: CandidateNomination;
  electionSummary?: ElectionSummary;
  state?: ApportionmentState;
  error?: ApiError;
}

export const ApportionmentProviderContext = createContext<iElectionApportionmentProviderContext | undefined>(undefined);

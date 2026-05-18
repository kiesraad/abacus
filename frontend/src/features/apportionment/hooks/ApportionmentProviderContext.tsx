import { createContext } from "react";

import type { ApiError, ApiResult } from "@/api/ApiResult";
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
  state: ApportionmentState;
  error?: ApiError;
  refetchState: (controller?: AbortController) => Promise<ApiResult<ApportionmentState>>;
}

export const ApportionmentProviderContext = createContext<iElectionApportionmentProviderContext | undefined>(undefined);

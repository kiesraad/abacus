import { createContext } from "react";

import type { ApiError } from "@/api/ApiResult";
import type {
  ApportionmentState,
  ApportionmentWarning,
  CandidateNomination,
  ElectionSummaryApportionment,
  SeatAssignment,
} from "@/types/generated/openapi";

export interface iElectionApportionmentProviderContext {
  seatAssignment?: SeatAssignment;
  candidateNomination?: CandidateNomination;
  electionSummary?: ElectionSummaryApportionment;
  warnings: ApportionmentWarning[];
  state?: ApportionmentState;
  error?: ApiError;
  isLoading: boolean;
  refetch: (controller?: AbortController) => Promise<void>;
}

export const ApportionmentProviderContext = createContext<iElectionApportionmentProviderContext | undefined>(undefined);

import { createContext } from "react";

import { ApiError, ElectionSummary, SeatAssignmentResult } from "@/api";

export interface iElectionApportionmentProviderContext {
  seatAssignment?: SeatAssignmentResult;
  electionSummary?: ElectionSummary;
  error?: ApiError;
}

export const ApportionmentProviderContext = createContext<iElectionApportionmentProviderContext | undefined>(undefined);

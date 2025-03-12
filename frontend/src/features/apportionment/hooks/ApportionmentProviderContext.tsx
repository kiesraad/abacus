import { createContext } from "react";

import { ApiError } from "@/api";
import { ApportionmentResult, ElectionSummary } from "@/types/generated/openapi";

export interface iElectionApportionmentProviderContext {
  apportionment?: ApportionmentResult;
  electionSummary?: ElectionSummary;
  error?: ApiError;
}

export const ApportionmentProviderContext = createContext<iElectionApportionmentProviderContext | undefined>(undefined);

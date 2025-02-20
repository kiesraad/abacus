import { createContext } from "react";

import { ApiError, ApportionmentResult, ElectionSummary } from "../index";

export interface iElectionApportionmentProviderContext {
  apportionment?: ApportionmentResult;
  electionSummary?: ElectionSummary;
  error?: ApiError;
}

export const ApportionmentProviderContext = createContext<iElectionApportionmentProviderContext | undefined>(undefined);

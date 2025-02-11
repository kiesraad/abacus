import { createContext } from "react";

import { ApiError, ApportionmentResult, ElectionSummary } from "../index";

export interface iElectionApportionmentProviderContext {
  apportionment?: ApportionmentResult;
  election_summary?: ElectionSummary;
  error?: ApiError;
}

export const ApportionmentProviderContext = createContext<iElectionApportionmentProviderContext | undefined>(undefined);

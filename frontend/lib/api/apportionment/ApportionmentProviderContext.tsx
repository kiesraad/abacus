import { createContext } from "react";

import { ApiRequestState, ApportionmentResult, ElectionApportionmentResponse, ElectionSummary } from "../index";

export interface iElectionApportionmentProviderContext {
  apportionment: Required<ApportionmentResult>;
  election_summary: Required<ElectionSummary>;
  requestState: Required<ApiRequestState<ElectionApportionmentResponse>>;
}

export const ApportionmentProviderContext = createContext<iElectionApportionmentProviderContext | undefined>(undefined);

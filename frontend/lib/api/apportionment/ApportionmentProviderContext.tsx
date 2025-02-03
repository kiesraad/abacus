import { createContext } from "react";

import { ApiResult, ApportionmentResult, ElectionApportionmentResponse, ElectionSummary } from "../index";

export interface iElectionApportionmentProviderContext {
  apportionment: Required<ApportionmentResult>;
  election_summary: Required<ElectionSummary>;
  refetch: (controller?: AbortController) => Promise<ApiResult<ElectionApportionmentResponse>>;
}

export const ApportionmentProviderContext = createContext<iElectionApportionmentProviderContext | undefined>(undefined);

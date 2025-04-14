import { createContext } from "react";

import { Election } from "@/api/gen/openapi";

export interface iElectionListProviderContext {
  electionList: Election[];
}

export const ElectionListProviderContext = createContext<iElectionListProviderContext | undefined>(undefined);

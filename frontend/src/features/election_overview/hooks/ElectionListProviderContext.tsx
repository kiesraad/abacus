import { createContext } from "react";

import { Election } from "@/types/generated/openapi";

export interface iElectionListProviderContext {
  electionList: Election[];
}

export const ElectionListProviderContext = createContext<iElectionListProviderContext | undefined>(undefined);

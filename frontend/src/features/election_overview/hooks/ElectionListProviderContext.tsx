import { createContext } from "react";

import { Election } from "@/api";

export interface iElectionListProviderContext {
  electionList: Election[];
}

export const ElectionListProviderContext = createContext<iElectionListProviderContext | undefined>(undefined);

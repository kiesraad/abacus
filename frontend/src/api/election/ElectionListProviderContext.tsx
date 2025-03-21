import { createContext } from "react";

import { Election } from "@kiesraad/api";

export interface iElectionListProviderContext {
  electionList: Election[];
}

export const ElectionListProviderContext = createContext<iElectionListProviderContext | undefined>(undefined);

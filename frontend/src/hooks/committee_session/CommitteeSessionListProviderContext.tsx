import { createContext } from "react";

import { CommitteeSession } from "@/types/generated/openapi";

export interface iCommitteeSessionListProviderContext {
  committeeSessions: CommitteeSession[];
}

export const CommitteeSessionListProviderContext = createContext<iCommitteeSessionListProviderContext | null>(null);

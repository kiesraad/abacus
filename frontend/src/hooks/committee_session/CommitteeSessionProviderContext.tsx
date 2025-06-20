import { createContext } from "react";

import { CommitteeSession } from "@/types/generated/openapi";

export interface iCommitteeSessionProviderContext {
  committeeSession: CommitteeSession;
}

export const CommitteeSessionProviderContext = createContext<iCommitteeSessionProviderContext | null>(null);

import * as React from "react";

import RequestStateHandler from "@/api/RequestStateHandler";

import { CommitteeSessionProviderContext } from "./CommitteeSessionProviderContext";
import { useCommitteeSessionDataRequest } from "./useCommitteeSessionDataRequest";

export interface CommitteeSessionProviderProps {
  children: React.ReactNode;
  electionId: number;
}

export function CommitteeSessionProvider({ children, electionId }: CommitteeSessionProviderProps) {
  const { requestState } = useCommitteeSessionDataRequest(electionId);

  return (
    <RequestStateHandler
      requestState={requestState}
      notFoundMessage="error.committee_session_not_found"
      isFoundCheck={(data) => typeof data === "object"}
      renderOnSuccess={(data) => (
        <CommitteeSessionProviderContext.Provider value={{ committeeSession: data }}>
          {children}
        </CommitteeSessionProviderContext.Provider>
      )}
    />
  );
}

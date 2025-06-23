import * as React from "react";

import RequestStateHandler from "@/api/RequestStateHandler";

import { CommitteeSessionListProviderContext } from "./CommitteeSessionListProviderContext";
import { useCommitteeSessionListRequest } from "./useCommitteeSessionListRequest";

export interface CommitteeSessionListProviderProps {
  children: React.ReactNode;
  electionId: number;
}

export function CommitteeSessionListProvider({ children, electionId }: CommitteeSessionListProviderProps) {
  const { requestState } = useCommitteeSessionListRequest(electionId);

  return (
    <RequestStateHandler
      requestState={requestState}
      notFoundMessage="error.committee_session_not_found"
      isFoundCheck={(data) => typeof data === "object"}
      renderOnSuccess={(data) => (
        <CommitteeSessionListProviderContext.Provider value={{ committeeSessions: data }}>
          {children}
        </CommitteeSessionListProviderContext.Provider>
      )}
    />
  );
}

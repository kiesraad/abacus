import type { ReactNode } from "react";
import RequestStateHandler from "@/api/RequestStateHandler";
import { ElectionStatusProviderContext } from "./ElectionStatusProviderContext";
import { useElectionStatusRequest } from "./useElectionStatusRequest";

export interface ElectionStatusProviderProps {
  children: ReactNode;
  electionId: number;
}

export function ElectionStatusProvider({ children, electionId }: ElectionStatusProviderProps) {
  const { requestState, refetch } = useElectionStatusRequest(electionId);

  return (
    <RequestStateHandler
      requestState={requestState}
      notFoundMessage="error.election_not_found"
      renderOnSuccess={(data) => (
        <ElectionStatusProviderContext.Provider value={{ statuses: data.statuses, refetch }}>
          {children}
        </ElectionStatusProviderContext.Provider>
      )}
    />
  );
}

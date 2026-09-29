import type { ReactNode } from "react";
import RequestStateHandler from "@/api/RequestStateHandler";
import { sortList } from "@/utils/sorting";
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
      renderOnSuccess={(data) => {
        // Sort statuses by source number (if source type is PollingStation) or source name (if source type is SubCommittee)
        const sortedStatuses = sortList(data.statuses, (status) => status.source);
        return (
          <ElectionStatusProviderContext.Provider value={{ statuses: sortedStatuses, refetch }}>
            {children}
          </ElectionStatusProviderContext.Provider>
        );
      }}
    />
  );
}

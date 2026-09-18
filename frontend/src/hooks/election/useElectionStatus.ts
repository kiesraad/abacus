import { useContext, useMemo } from "react";
import { sortList } from "@/utils/sorting";
import { ElectionStatusProviderContext } from "./ElectionStatusProviderContext";

export function useElectionStatus() {
  const context = useContext(ElectionStatusProviderContext);

  if (!context) {
    throw new Error("useElectionStatus must be used within an ElectionStatusProvider");
  }

  const { statuses, refetch } = context;
  // Sort statuses by source number (if source type is PollingStation) or source name (if source type is SubCommittee)
  const sortedStatuses = useMemo(() => sortList(statuses, (status) => status.source), [statuses]);

  return {
    statuses: sortedStatuses,
    refetch,
  };
}

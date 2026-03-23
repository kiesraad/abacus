import { useContext } from "react";

import type { ElectionStatusResponseEntry } from "@/types/generated/openapi";

import { ElectionStatusProviderContext } from "./ElectionStatusProviderContext";

export function useElectionStatus() {
  const context = useContext(ElectionStatusProviderContext);

  if (!context) {
    throw new Error("useElectionStatus must be used within an ElectionStatusProvider");
  }

  return context;
}

export function getDataEntryIdForPollingStation(
  statuses: ElectionStatusResponseEntry[],
  pollingStationId: number,
): number | undefined {
  return statuses.find((s) => s.source.type === "PollingStation" && s.source.id === pollingStationId)?.data_entry_id;
}

import { PollingStationStatus, useElectionStatus } from "@kiesraad/api";

export function usePollingStationStatus(
  pollingStationId: number | undefined,
  showInProgress = false,
): PollingStationStatus | undefined {
  const electionStatus = useElectionStatus();
  if (pollingStationId === undefined) return undefined;
  const result = electionStatus.statuses.find((status) => status.id === pollingStationId);
  if (!showInProgress && result?.status === "first_entry_in_progress") {
    return "first_entry";
  } else {
    return result?.status;
  }
}

import { PollingStationStatus, useElectionStatus } from "@kiesraad/api";

export function usePollingStationStatus(pollingStationId: number | undefined): PollingStationStatus | undefined {
  const electionStatus = useElectionStatus();
  if (pollingStationId === undefined) return undefined;
  const result = electionStatus.statuses.find((status) => status.id === pollingStationId);
  return result?.status;
}

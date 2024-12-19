import { DataEntryStatusName, useElectionStatus } from "@kiesraad/api";

export function usePollingStationStatus(pollingStationId: number | undefined): DataEntryStatusName | undefined {
  const electionStatus = useElectionStatus();
  if (pollingStationId === undefined) return undefined;
  const result = electionStatus.statuses.find((status) => status.polling_station_id === pollingStationId);
  return result?.status;
}

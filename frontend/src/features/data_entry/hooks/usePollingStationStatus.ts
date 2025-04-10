import { useElectionStatus } from "@/api/election/useElectionStatus";
import { DataEntryStatusName } from "@/api/gen/openapi";
import { useUser } from "@/api/useUser";

export type UsePollingStationStatusReturnType = {
  status: DataEntryStatusName | undefined;
  assignedToDifferentUser?: boolean;
};

export function usePollingStationStatus(pollingStationId: number | undefined): UsePollingStationStatusReturnType {
  const electionStatuses = useElectionStatus();
  const user = useUser();

  if (pollingStationId === undefined) {
    return { status: undefined };
  }

  const electionStatus = electionStatuses.statuses.find((status) => status.polling_station_id === pollingStationId);

  const result: UsePollingStationStatusReturnType = {
    status: electionStatus?.status,
  };

  switch (electionStatus?.status) {
    case "first_entry_in_progress":
      result.assignedToDifferentUser = user?.user_id !== electionStatus.first_entry_user_id;
      break;
    case "second_entry_in_progress":
      result.assignedToDifferentUser = user?.user_id !== electionStatus.second_entry_user_id;
      break;
  }

  return result;
}

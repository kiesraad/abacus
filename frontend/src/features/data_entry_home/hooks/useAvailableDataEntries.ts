import { useMemo } from "react";
import { useElectionStatus } from "@/hooks/election/useElectionStatus";
import { useUser } from "@/hooks/user/useUser";
import { type DataEntryStatusWithUserStatus, DataEntryUserStatus, getDataEntryWithStatusList } from "../utils/util";

const NOT_AVAILABLE_STATUSES: DataEntryUserStatus[] = [
  DataEntryUserStatus.Finished,
  DataEntryUserStatus.SecondEntryNotAllowed,
  DataEntryUserStatus.HasErrors,
];

export interface UseAvailableDataEntries {
  dataEntryWithStatus: DataEntryStatusWithUserStatus[];
  availableCurrentUser: DataEntryStatusWithUserStatus[];
  inProgressCurrentUser: DataEntryStatusWithUserStatus[];
}

export function useAvailableDataEntries(): UseAvailableDataEntries {
  const user = useUser();
  const { statuses } = useElectionStatus();

  return useMemo(() => {
    const dataEntryWithStatus = getDataEntryWithStatusList({ statuses, user });

    const available = dataEntryWithStatus.filter((dataEntry) => !NOT_AVAILABLE_STATUSES.includes(dataEntry.userStatus));
    const availableCurrentUser = available.filter(
      (dataEntry) => dataEntry.userStatus !== DataEntryUserStatus.InProgressOtherUser,
    );
    const inProgressCurrentUser = availableCurrentUser.filter(
      (dataEntry) => dataEntry.userStatus === DataEntryUserStatus.InProgressCurrentUser,
    );

    return { dataEntryWithStatus, availableCurrentUser, inProgressCurrentUser };
  }, [statuses, user]);
}

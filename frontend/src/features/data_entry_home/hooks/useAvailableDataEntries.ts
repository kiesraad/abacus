import { useMemo } from "react";
import { useUser } from "@/hooks/user/useUser";
import type { ElectionStatusResponseEntry } from "@/types/generated/openapi";
import { sortList } from "@/utils/sorting";
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

export function useAvailableDataEntries(statuses: ElectionStatusResponseEntry[]): UseAvailableDataEntries {
  const user = useUser();

  return useMemo(() => {
    const dataEntryWithStatus = getDataEntryWithStatusList({ statuses, user });

    const available = dataEntryWithStatus.filter((dataEntry) => !NOT_AVAILABLE_STATUSES.includes(dataEntry.userStatus));
    const sortedAvailable = sortList(available, (item) => {
      return item.statusEntry.source;
    });
    const availableCurrentUser = sortedAvailable.filter(
      (dataEntry) => dataEntry.userStatus !== DataEntryUserStatus.InProgressOtherUser,
    );
    const inProgressCurrentUser = availableCurrentUser.filter(
      (dataEntry) => dataEntry.userStatus === DataEntryUserStatus.InProgressCurrentUser,
    );

    return { dataEntryWithStatus, availableCurrentUser, inProgressCurrentUser };
  }, [statuses, user]);
}

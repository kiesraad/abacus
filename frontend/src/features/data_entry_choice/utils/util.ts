import { DataEntryStatusName, ElectionStatusResponseEntry, LoginResponse, PollingStation } from "@/api";

export enum PollingStationUserStatus {
  Available,
  InProgressCurrentUser,
  InProgressOtherUser,
  SecondEntryNotAllowed,
  Finished,
}

export type PollingStationWithStatus = PollingStation & {
  statusEntry: ElectionStatusResponseEntry;
  userStatus: PollingStationUserStatus;
};

export const finishedStatuses: DataEntryStatusName[] = ["entries_different", "definitive"];

export function getPollingStationWithStatusList({
  pollingStations,
  statuses,
  user,
}: {
  pollingStations: PollingStation[];
  statuses: ElectionStatusResponseEntry[];
  user: LoginResponse | null;
}): PollingStationWithStatus[] {
  return pollingStations.flatMap((pollingStation: PollingStation) => {
    const statusEntry = statuses.find((status) => status.polling_station_id === pollingStation.id);
    if (!statusEntry) {
      return [];
    }

    const result: PollingStationWithStatus = {
      ...pollingStation,
      statusEntry,
      userStatus: PollingStationUserStatus.Available,
    };

    if (finishedStatuses.includes(statusEntry.status)) {
      result.userStatus = PollingStationUserStatus.Finished;
    } else if (statusEntry.status === "first_entry_in_progress") {
      if (statusEntry.first_entry_user_id === user?.user_id) {
        result.userStatus = PollingStationUserStatus.InProgressCurrentUser;
      } else {
        result.userStatus = PollingStationUserStatus.InProgressOtherUser;
      }
    } else if (statusEntry.status === "second_entry_in_progress") {
      if (statusEntry.second_entry_user_id === user?.user_id) {
        result.userStatus = PollingStationUserStatus.InProgressCurrentUser;
      } else {
        result.userStatus = PollingStationUserStatus.InProgressOtherUser;
      }
    } else if (statusEntry.status === "second_entry_not_started" && statusEntry.first_entry_user_id === user?.user_id) {
      result.userStatus = PollingStationUserStatus.SecondEntryNotAllowed;
    }

    return result;
  });
}

export function getUrlForDataEntry(
  electionId: number,
  pollingStationId: number,
  pollingStationStatus?: DataEntryStatusName,
): string {
  const entryNumber = pollingStationStatus?.startsWith("second_entry") ? 2 : 1;
  return `/elections/${electionId}/data-entry/${pollingStationId}/${entryNumber}`;
}

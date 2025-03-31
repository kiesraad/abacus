import { DataEntryStatusName, ElectionStatusResponseEntry, LoginResponse, PollingStation } from "@/api";

export enum PollingStationUserStatus {
  MISSING = "MISSING",
  IN_PROGRESS_CURRENT_USER = "IN_PROGRESS_CURRENT_USER",
  IN_PROGRESS_OTHER_USER = "IN_PROGRESS_OTHER_USER",
  FINISHED = "FINISHED",
  UNKNOWN = "UNKNOWN",
}

export type PollingStationWithStatus = PollingStation & {
  statusEntry?: ElectionStatusResponseEntry;
  userStatus: PollingStationUserStatus;
};

export const dataEntryFinished: DataEntryStatusName[] = ["entries_different", "definitive"];

export function getPollingStationWithStatusList({
  pollingStations,
  statuses,
  user,
}: {
  pollingStations: PollingStation[];
  statuses: ElectionStatusResponseEntry[];
  user: LoginResponse | null;
}): PollingStationWithStatus[] {
  return pollingStations.map((pollingStation: PollingStation) => {
    const result: PollingStationWithStatus = {
      ...pollingStation,
      userStatus: PollingStationUserStatus.UNKNOWN,
    };
    const statusEntry = statuses.find((status) => status.polling_station_id === pollingStation.id);

    if (!statusEntry) return result;

    result.statusEntry = statusEntry;

    if (dataEntryFinished.includes(statusEntry.status)) {
      result.userStatus = PollingStationUserStatus.FINISHED;
    } else if (statusEntry.status === "first_entry_in_progress") {
      if (statusEntry.first_entry_user_id === user?.user_id) {
        result.userStatus = PollingStationUserStatus.IN_PROGRESS_CURRENT_USER;
      } else {
        result.userStatus = PollingStationUserStatus.IN_PROGRESS_OTHER_USER;
      }
    } else if (statusEntry.status === "second_entry_in_progress") {
      if (statusEntry.second_entry_user_id === user?.user_id) {
        result.userStatus = PollingStationUserStatus.IN_PROGRESS_CURRENT_USER;
      } else {
        result.userStatus = PollingStationUserStatus.IN_PROGRESS_OTHER_USER;
      }
    }

    return result;
  });
}

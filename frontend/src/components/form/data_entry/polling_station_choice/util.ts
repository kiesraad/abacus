import { DataEntryStatusName, ElectionStatusResponseEntry, LoginResponse, PollingStation } from "@/api";

export enum PollingStationUserStatus {
  MISSING = "MISSING",
  IN_PROGRESS_CURRENT_USER = "IN_PROGRESS_CURRENT_USER",
  IN_PROGRESS_OTHER_USER = "IN_PROGRESS_OTHER_USER",
  FINISHED = "FINISHED",
  UNKNOWN = "UNKNOWN",
}

export type PollingStationStatus = {
  statusEntry?: ElectionStatusResponseEntry;
  userStatus: PollingStationUserStatus;
};

const dataEntryFinished: DataEntryStatusName[] = ["entries_different", "definitive"];

export function getPollingStationStatus({
  pollingStation,
  statuses,
  user,
}: {
  pollingStation: PollingStation | undefined;
  statuses: ElectionStatusResponseEntry[];
  user: LoginResponse | null;
}): PollingStationStatus {
  const result: PollingStationStatus = {
    statusEntry: undefined,
    userStatus: PollingStationUserStatus.UNKNOWN,
  };

  const statusEntry = statuses.find((status) => status.polling_station_id === pollingStation?.id);

  if (!statusEntry) {
    return result;
  }
  result.statusEntry = statusEntry;

  if (dataEntryFinished.includes(statusEntry.status)) {
    result.userStatus = PollingStationUserStatus.FINISHED;
  }

  if (statusEntry.status === "first_entry_in_progress") {
    if (statusEntry.first_entry_user_id === user?.user_id) {
      result.userStatus = PollingStationUserStatus.IN_PROGRESS_CURRENT_USER;
    } else {
      result.userStatus = PollingStationUserStatus.IN_PROGRESS_OTHER_USER;
    }
  }

  if (statusEntry.status === "second_entry_in_progress") {
    if (statusEntry.second_entry_user_id === user?.user_id) {
      result.userStatus = PollingStationUserStatus.IN_PROGRESS_CURRENT_USER;
    } else {
      result.userStatus = PollingStationUserStatus.IN_PROGRESS_OTHER_USER;
    }
  }

  return result;
}

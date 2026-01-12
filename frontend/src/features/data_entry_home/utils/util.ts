import type {
  DataEntryStatusName,
  ElectionStatusResponseEntry,
  LoginResponse,
  PollingStation,
} from "@/types/generated/openapi";

export enum PollingStationUserStatus {
  Available,
  EntryNotAllowed,
  InProgressCurrentUser,
  InProgressOtherUser,
  SecondEntryNotAllowed,
  HasErrors,
  Finished,
}

export type PollingStationWithStatus = PollingStation & {
  statusEntry?: ElectionStatusResponseEntry;
  userStatus: PollingStationUserStatus;
};

const finishedStatuses: DataEntryStatusName[] = ["entries_different", "definitive"];

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
    const result: PollingStationWithStatus = {
      ...pollingStation,
      statusEntry,
      userStatus: PollingStationUserStatus.Available,
    };

    if (!statusEntry) {
      result.userStatus = PollingStationUserStatus.EntryNotAllowed;
    } else if (finishedStatuses.includes(statusEntry.status)) {
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
    } else if (statusEntry.status === "first_entry_finalised" && statusEntry.first_entry_user_id === user?.user_id) {
      result.userStatus = PollingStationUserStatus.SecondEntryNotAllowed;
    } else if (statusEntry.status === "first_entry_has_errors") {
      result.userStatus = PollingStationUserStatus.HasErrors;
    }

    return result;
  });
}

export function getUrlForDataEntry(
  electionId: number,
  pollingStationId: number,
  pollingStationStatus?: DataEntryStatusName,
): string {
  const entryNumber =
    pollingStationStatus === "first_entry_finalised" || pollingStationStatus === "second_entry_in_progress" ? 2 : 1;
  return `/elections/${electionId}/data-entry/${pollingStationId}/${entryNumber}`;
}

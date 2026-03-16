import type { DataEntryStatusName, ElectionStatusResponseEntry, LoginResponse } from "@/types/generated/openapi";

export enum DataEntryUserStatus {
  Available,
  EntryNotAllowed,
  InProgressCurrentUser,
  InProgressOtherUser,
  SecondEntryNotAllowed,
  HasErrors,
  Finished,
}

export interface DataEntryStatusWithUserStatus {
  statusEntry: ElectionStatusResponseEntry;
  userStatus: DataEntryUserStatus;
}

const finishedStatuses: DataEntryStatusName[] = ["entries_different", "definitive"];

export function getDataEntryWithStatusList({
  statuses,
  user,
}: {
  statuses: ElectionStatusResponseEntry[];
  user: LoginResponse | null;
}): DataEntryStatusWithUserStatus[] {
  return statuses.map((statusEntry: ElectionStatusResponseEntry) => {
    const result: DataEntryStatusWithUserStatus = { statusEntry, userStatus: DataEntryUserStatus.Available };

    if (finishedStatuses.includes(statusEntry.status)) {
      result.userStatus = DataEntryUserStatus.Finished;
    } else if (statusEntry.status === "first_entry_in_progress") {
      if (statusEntry.first_entry_user_id === user?.user_id) {
        result.userStatus = DataEntryUserStatus.InProgressCurrentUser;
      } else {
        result.userStatus = DataEntryUserStatus.InProgressOtherUser;
      }
    } else if (statusEntry.status === "second_entry_in_progress") {
      if (statusEntry.second_entry_user_id === user?.user_id) {
        result.userStatus = DataEntryUserStatus.InProgressCurrentUser;
      } else {
        result.userStatus = DataEntryUserStatus.InProgressOtherUser;
      }
    } else if (statusEntry.status === "first_entry_finalised" && statusEntry.first_entry_user_id === user?.user_id) {
      result.userStatus = DataEntryUserStatus.SecondEntryNotAllowed;
    } else if (statusEntry.status === "first_entry_has_errors") {
      result.userStatus = DataEntryUserStatus.HasErrors;
    }

    return result;
  });
}

export function getUrlForDataEntry(electionId: number, dataEntry: ElectionStatusResponseEntry): string {
  const entryNumber =
    dataEntry.status === "first_entry_finalised" || dataEntry.status === "second_entry_in_progress" ? 2 : 1;
  return `/elections/${electionId}/data-entry/${dataEntry.source.id}/${entryNumber}`;
}

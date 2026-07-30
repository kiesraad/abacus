import type { ElectionStatusResponseEntry, LoginResponse, UserId } from "@/types/generated/openapi";

export enum DataEntryUserStatus {
  Available,
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

function determineUserStatus(
  userId: UserId | undefined,
  statusEntry: ElectionStatusResponseEntry,
): DataEntryUserStatus {
  switch (statusEntry.status) {
    case "empty":
      return DataEntryUserStatus.Available;
    case "first_entry_in_progress":
    case "first_entry_correction":
      if (statusEntry.first_entry_user_id === userId) {
        return DataEntryUserStatus.InProgressCurrentUser;
      } else {
        return DataEntryUserStatus.InProgressOtherUser;
      }
    case "first_entry_finalised":
      if (statusEntry.first_entry_user_id === userId) {
        return DataEntryUserStatus.SecondEntryNotAllowed;
      } else {
        return DataEntryUserStatus.Available;
      }
    case "second_entry_in_progress":
    case "second_entry_correction":
      if (statusEntry.second_entry_user_id === userId) {
        return DataEntryUserStatus.InProgressCurrentUser;
      } else {
        return DataEntryUserStatus.InProgressOtherUser;
      }
    case "first_entry_has_errors":
      return DataEntryUserStatus.HasErrors;
    case "entries_different":
    case "definitive":
      return DataEntryUserStatus.Finished;
  }
}

export function getDataEntryWithStatusList({
  statuses,
  user,
}: {
  statuses: ElectionStatusResponseEntry[];
  user: LoginResponse | null;
}): DataEntryStatusWithUserStatus[] {
  return statuses.map((statusEntry: ElectionStatusResponseEntry) => ({
    statusEntry,
    userStatus: determineUserStatus(user?.user_id, statusEntry),
  }));
}

const secondEntryStatuses = ["first_entry_finalised", "second_entry_in_progress", "second_entry_correction"];

export function getUrlForDataEntry(electionId: number, dataEntry: ElectionStatusResponseEntry): string {
  const entryNumber = secondEntryStatuses.includes(dataEntry.status) ? 2 : 1;
  return `/elections/${electionId}/data-entry/${dataEntry.data_entry_id}/${entryNumber}`;
}

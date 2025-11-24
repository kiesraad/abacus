import { CommitteeSessionStatus } from "@/types/generated/openapi";

export function isPollingStationCreateAndUpdateAllowed(
  isCoordinator: boolean,
  isAdministrator: boolean,
  currentCommitteeSessionStatus: CommitteeSessionStatus,
) {
  return (
    isCoordinator ||
    (isAdministrator &&
      (currentCommitteeSessionStatus === "created" || currentCommitteeSessionStatus === "data_entry_not_started"))
  );
}

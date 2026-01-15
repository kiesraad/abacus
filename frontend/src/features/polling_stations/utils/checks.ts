import type { CommitteeSessionStatus } from "@/types/generated/openapi";

export function isPollingStationCreateAndUpdateAllowed(
  isCoordinator: boolean,
  isAdministrator: boolean,
  currentCommitteeSessionStatus: CommitteeSessionStatus,
) {
  return (
    isCoordinator ||
    (isAdministrator &&
      (currentCommitteeSessionStatus === "created" || currentCommitteeSessionStatus === "in_preparation"))
  );
}

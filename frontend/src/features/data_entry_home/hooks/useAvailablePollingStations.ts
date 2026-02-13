import { useMemo } from "react";
import { useElection } from "@/hooks/election/useElection";
import { useElectionStatus } from "@/hooks/election/useElectionStatus";
import { useUser } from "@/hooks/user/useUser";
import type { ElectionStatusResponseEntry, LoginResponse, PollingStation } from "@/types/generated/openapi";
import {
  getPollingStationWithStatusList,
  PollingStationUserStatus,
  type PollingStationWithStatus,
} from "../utils/util";

const NOT_AVAILABLE_STATUSES: PollingStationUserStatus[] = [
  PollingStationUserStatus.Finished,
  PollingStationUserStatus.EntryNotAllowed,
  PollingStationUserStatus.SecondEntryNotAllowed,
  PollingStationUserStatus.HasErrors,
];

export interface UseAvailablePollingStationsParams {
  pollingStations: PollingStation[];
  statuses: ElectionStatusResponseEntry[];
  user: LoginResponse | null;
}

export interface AvailablePollingStations {
  pollingStationsWithStatus: PollingStationWithStatus[];
  availableCurrentUser: PollingStationWithStatus[];
  inProgressCurrentUser: PollingStationWithStatus[];
}

export function useAvailablePollingStations(): AvailablePollingStations {
  const user = useUser();
  const { pollingStations } = useElection();
  const { statuses } = useElectionStatus();

  return useMemo(() => {
    const pollingStationsWithStatus = getPollingStationWithStatusList({
      pollingStations,
      statuses,
      user,
    });

    const available = pollingStationsWithStatus.filter(
      (pollingStation) => !NOT_AVAILABLE_STATUSES.includes(pollingStation.userStatus),
    );
    const availableCurrentUser = available.filter(
      (pollingStation) => pollingStation.userStatus !== PollingStationUserStatus.InProgressOtherUser,
    );
    const inProgressCurrentUser = availableCurrentUser.filter(
      (pollingStation) => pollingStation.userStatus === PollingStationUserStatus.InProgressCurrentUser,
    );

    return { pollingStationsWithStatus, availableCurrentUser, inProgressCurrentUser };
  }, [pollingStations, statuses, user]);
}

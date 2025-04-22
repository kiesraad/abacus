import { useState } from "react";

import { NotFoundError } from "@/api/ApiResult";
import { useInitialApiGet, useInitialApiGetWithErrors } from "@/api/useInitialApiGet";
import { useElection } from "@/hooks/election/useElection";
import {
  DataEntryStatus,
  Election,
  EntriesDifferent,
  PoliticalGroup,
  POLLING_STATION_DATA_ENTRY_STATUS_REQUEST_PATH,
  PollingStation,
  ResolveAction,
  USER_LIST_REQUEST_PATH,
  UserListResponse,
} from "@/types/generated/openapi";

type EntriesDifferentStatus = {
  state: EntriesDifferent;
  status: "EntriesDifferent";
  first_user: string;
  second_user: string;
};

interface PollingStationDataEntryStatus {
  choice: ResolveAction | null;
  setChoice: (choice: ResolveAction | null) => void;
  pollingStation: PollingStation;
  election: Election & { political_groups: PoliticalGroup[] };
  loading: boolean;
  status: EntriesDifferentStatus | null;
}

export function usePollingStationDataEntryDifferences(pollingStationId: number): PollingStationDataEntryStatus {
  const { election, pollingStations } = useElection();

  const pollingStation = pollingStations.find((ps) => ps.id === pollingStationId);
  const [choice, setChoice] = useState<ResolveAction | null>(null);

  if (!pollingStation) {
    throw new NotFoundError("error.polling_station_not_found");
  }

  const path: POLLING_STATION_DATA_ENTRY_STATUS_REQUEST_PATH = `/api/polling_stations/${pollingStationId}/data_entries`;
  const { requestState } = useInitialApiGet<DataEntryStatus>(path);

  // render generic error page when any error occurs
  if (requestState.status === "api-error") {
    throw requestState.error;
  }

  const usersPath: USER_LIST_REQUEST_PATH = "/api/user";
  const { requestState: usersRequestState } = useInitialApiGetWithErrors<UserListResponse>(usersPath);

  if (usersRequestState.status === "api-error") {
    throw usersRequestState.error;
  }

  // only allow polling stations with status "EntriesDifferent" to be resolved
  if (requestState.status === "success" && requestState.data.status !== "EntriesDifferent") {
    throw new NotFoundError("error.polling_station_not_found");
  }

  let status: EntriesDifferentStatus | null = null;

  if (
    requestState.status === "success" &&
    usersRequestState.status === "success" &&
    requestState.data.status === "EntriesDifferent"
  ) {
    const users = usersRequestState.data.users;
    const state = requestState.data.state;
    status = {
      ...requestState.data,
      first_user: users.find((u) => u.id === state.first_entry_user_id)?.fullname || "",
      second_user: users.find((u) => u.id === state.second_entry_user_id)?.fullname || "",
    };
  }

  return {
    choice,
    setChoice,
    pollingStation,
    election,
    loading: requestState.status === "loading" || usersRequestState.status === "loading",
    status,
  };
}

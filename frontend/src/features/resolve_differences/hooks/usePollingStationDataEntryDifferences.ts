import { useContext, useState } from "react";

import { AnyApiError, isSuccess, NotFoundError } from "@/api/ApiResult";
import { useApiClient } from "@/api/useApiClient";
import { useInitialApiGet, useInitialApiGetWithErrors } from "@/api/useInitialApiGet";
import { ElectionStatusProviderContext } from "@/hooks/election/ElectionStatusProviderContext";
import { useElection } from "@/hooks/election/useElection";
import {
  DataEntryStatus,
  Election,
  EntriesDifferent,
  PoliticalGroup,
  POLLING_STATION_DATA_ENTRY_RESOLVE_REQUEST_BODY,
  POLLING_STATION_DATA_ENTRY_RESOLVE_REQUEST_PATH,
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
  onSubmit: () => Promise<void>;
}

export function usePollingStationDataEntryDifferences(
  pollingStationId: number,
  afterSave: () => void,
): PollingStationDataEntryStatus {
  const client = useApiClient();
  const { election, pollingStations } = useElection();
  const pollingStation = pollingStations.find((ps) => ps.id === pollingStationId);
  const [choice, setChoice] = useState<ResolveAction | null>(null);
  const electionContext = useContext(ElectionStatusProviderContext);
  const [error, setError] = useState<AnyApiError | null>(null);

  // fetch the current status of the polling station
  const path: POLLING_STATION_DATA_ENTRY_STATUS_REQUEST_PATH = `/api/polling_stations/${pollingStationId}/data_entries`;
  const { requestState } = useInitialApiGet<DataEntryStatus>(path);

  // fetch a list of users, to render the first entry and second entry user names
  const usersPath: USER_LIST_REQUEST_PATH = "/api/user";
  const { requestState: usersRequestState } = useInitialApiGetWithErrors<UserListResponse>(usersPath);

  // 404 error if polling station is not found
  if (!pollingStation) {
    throw new NotFoundError("error.polling_station_not_found");
  }

  // propagate error that occurred during a save request
  if (error) {
    throw error;
  }

  // render generic error page when any error occurs
  if (requestState.status === "api-error") {
    throw requestState.error;
  }

  // render generic error page when any error occurs
  if (usersRequestState.status === "api-error") {
    throw usersRequestState.error;
  }

  // only allow polling stations with status "EntriesDifferent" to be resolved
  if (requestState.status === "success" && requestState.data.status !== "EntriesDifferent") {
    throw new NotFoundError("error.polling_station_not_found");
  }

  let status: EntriesDifferentStatus | null = null;

  // if the request was successful and the status is "EntriesDifferent", we can show the details
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

  const onSubmit = async () => {
    if (choice === null) {
      return;
    }

    const path: POLLING_STATION_DATA_ENTRY_RESOLVE_REQUEST_PATH = `/api/polling_stations/${pollingStationId}/data_entries/resolve`;
    const body: POLLING_STATION_DATA_ENTRY_RESOLVE_REQUEST_BODY = choice;
    const response = await client.postRequest(path, body);

    if (isSuccess(response)) {
      // reload the election status and navigate to the overview page
      await electionContext?.refetch();
      afterSave();
    } else {
      setError(response);
    }
  };

  return {
    choice,
    setChoice,
    pollingStation,
    election,
    loading: requestState.status === "loading" || usersRequestState.status === "loading",
    status,
    onSubmit,
  };
}

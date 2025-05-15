import { useContext, useState } from "react";

import { AnyApiError, isSuccess, NotFoundError } from "@/api/ApiResult";
import { useApiClient } from "@/api/useApiClient";
import { useInitialApiGet, useInitialApiGetWithErrors } from "@/api/useInitialApiGet";
import { ElectionStatusProviderContext } from "@/hooks/election/ElectionStatusProviderContext";
import { useElection } from "@/hooks/election/useElection";
import { t } from "@/i18n/translate";
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
  action: ResolveAction | undefined;
  setAction: (action: ResolveAction | undefined) => void;
  pollingStation: PollingStation;
  election: Election & { political_groups: PoliticalGroup[] };
  loading: boolean;
  status: EntriesDifferentStatus | null;
  onSubmit: () => Promise<void>;
  validationError: string | undefined;
}

export function usePollingStationDataEntryDifferences(
  pollingStationId: number,
  afterSave: () => void,
): PollingStationDataEntryStatus {
  const client = useApiClient();
  const { election, pollingStations } = useElection();
  const pollingStation = pollingStations.find((ps) => ps.id === pollingStationId);
  const [action, setAction] = useState<ResolveAction>();
  const electionContext = useContext(ElectionStatusProviderContext);
  const [error, setError] = useState<AnyApiError | null>(null);
  const [validationError, setValidationError] = useState<string>();

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
    const firstUser = users.find((u) => u.id === state.first_entry_user_id);
    const secondUser = users.find((u) => u.id === state.second_entry_user_id);

    status = {
      ...requestState.data,
      first_user: firstUser?.fullname || firstUser?.username || "",
      second_user: secondUser?.fullname || secondUser?.username || "",
    };
  }

  const onSubmit = async () => {
    if (action === undefined) {
      setValidationError(t("resolve_differences.required_error"));
      return;
    } else {
      setValidationError(undefined);
    }

    const path: POLLING_STATION_DATA_ENTRY_RESOLVE_REQUEST_PATH = `/api/polling_stations/${pollingStationId}/data_entries/resolve`;
    const body: POLLING_STATION_DATA_ENTRY_RESOLVE_REQUEST_BODY = action;
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
    action,
    setAction,
    pollingStation,
    election,
    loading: requestState.status === "loading" || usersRequestState.status === "loading",
    status,
    onSubmit,
    validationError,
  };
}

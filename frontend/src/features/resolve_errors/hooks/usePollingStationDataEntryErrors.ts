import { useContext, useState } from "react";

import { AnyApiError, isSuccess, NotFoundError } from "@/api/ApiResult";
import { useApiClient } from "@/api/useApiClient";
import { useInitialApiGet, useInitialApiGetWithErrors } from "@/api/useInitialApiGet";
import { ElectionStatusProviderContext } from "@/hooks/election/ElectionStatusProviderContext";
import { useElection } from "@/hooks/election/useElection";
import { t } from "@/i18n/translate";
import {
  DataEntryGetErrorsResponse,
  Election,
  PoliticalGroup,
  POLLING_STATION_DATA_ENTRY_GET_ERRORS_REQUEST_PATH,
  POLLING_STATION_DATA_ENTRY_RESOLVE_ERRORS_REQUEST_BODY,
  POLLING_STATION_DATA_ENTRY_RESOLVE_ERRORS_REQUEST_PATH,
  PollingStation,
  ResolveErrorsAction,
  USER_LIST_REQUEST_PATH,
  UserListResponse,
} from "@/types/generated/openapi";

interface DataEntryErrors {
  action: ResolveErrorsAction | undefined;
  setAction: (action: ResolveErrorsAction | undefined) => void;
  pollingStation: PollingStation;
  election: Election & { political_groups: PoliticalGroup[] };
  loading: boolean;
  dataEntry: DataEntryGetErrorsResponse | null;
  userFullname: string | undefined;
  onSubmit: () => Promise<void>;
  validationError: string | undefined;
}

export function usePollingStationDataEntryErrors(
  pollingStationId: number,
  afterSave: (action: ResolveErrorsAction) => void,
): DataEntryErrors {
  const client = useApiClient();
  const { election, pollingStations } = useElection();
  const pollingStation = pollingStations.find((ps) => ps.id === pollingStationId);
  const [action, setAction] = useState<ResolveErrorsAction>();
  const electionContext = useContext(ElectionStatusProviderContext);
  const [error, setError] = useState<AnyApiError | null>(null);
  const [validationError, setValidationError] = useState<string>();

  // fetch the data entry with errors and warnings
  const path: POLLING_STATION_DATA_ENTRY_GET_ERRORS_REQUEST_PATH = `/api/polling_stations/${pollingStationId}/data_entries/resolve_errors`;
  const { requestState } = useInitialApiGet<DataEntryGetErrorsResponse>(path);

  // fetch a list of users, to render username
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
  if (usersRequestState.status === "api-error") {
    throw usersRequestState.error;
  }

  let dataEntry: DataEntryGetErrorsResponse | null = null;
  let userFullname: string | undefined = undefined;

  if (requestState.status === "success" && usersRequestState.status === "success") {
    dataEntry = requestState.data;

    const user = usersRequestState.data.users.find((u) => u.id === requestState.data.first_entry_user_id);
    userFullname = user?.fullname ?? user?.username;
  }

  const onSubmit = async () => {
    if (action === undefined) {
      setValidationError(t("resolve_differences.required_error"));
      return;
    } else {
      setValidationError(undefined);
    }

    const path: POLLING_STATION_DATA_ENTRY_RESOLVE_ERRORS_REQUEST_PATH = `/api/polling_stations/${pollingStationId}/data_entries/resolve_errors`;
    const body: POLLING_STATION_DATA_ENTRY_RESOLVE_ERRORS_REQUEST_BODY = action;
    const response = await client.postRequest(path, body);

    if (isSuccess(response)) {
      // reload the election status and navigate to the overview page
      await electionContext?.refetch();
      afterSave(action);
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
    dataEntry,
    userFullname,
    onSubmit,
    validationError,
  };
}

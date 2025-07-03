import { useContext, useState } from "react";

import { AnyApiError, isSuccess, NotFoundError } from "@/api/ApiResult";
import { useApiClient } from "@/api/useApiClient";
import { useInitialApiGet } from "@/api/useInitialApiGet";
import { ElectionStatusProviderContext } from "@/hooks/election/ElectionStatusProviderContext";
import { useElection } from "@/hooks/election/useElection";
import { t } from "@/i18n/translate";
import {
  DataEntryGetErrorsResponse,
  ElectionWithPoliticalGroups,
  POLLING_STATION_DATA_ENTRY_GET_ERRORS_REQUEST_PATH,
  POLLING_STATION_DATA_ENTRY_RESOLVE_ERRORS_REQUEST_BODY,
  POLLING_STATION_DATA_ENTRY_RESOLVE_ERRORS_REQUEST_PATH,
  PollingStation,
  ResolveErrorsAction,
} from "@/types/generated/openapi";

interface DataEntryErrors {
  action: ResolveErrorsAction | undefined;
  setAction: (action: ResolveErrorsAction | undefined) => void;
  pollingStation: PollingStation;
  election: ElectionWithPoliticalGroups;
  loading: boolean;
  dataEntry: DataEntryGetErrorsResponse | null;
  onSubmit: (afterSave: (action: ResolveErrorsAction) => void) => Promise<void>;
  validationError: string | undefined;
}

export function usePollingStationDataEntryErrors(pollingStationId: number): DataEntryErrors {
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

  const onSubmit = async (afterSave: (action: ResolveErrorsAction) => void) => {
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
    loading: requestState.status === "loading",
    dataEntry: requestState.status === "success" ? requestState.data : null,
    onSubmit,
    validationError,
  };
}

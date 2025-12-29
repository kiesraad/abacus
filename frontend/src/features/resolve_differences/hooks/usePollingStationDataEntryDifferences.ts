import { useContext, useState } from "react";

import { type AnyApiError, isSuccess, NotFoundError } from "@/api/ApiResult";
import { useApiClient } from "@/api/useApiClient";
import { useInitialApiGet } from "@/api/useInitialApiGet";
import { ElectionStatusProviderContext } from "@/hooks/election/ElectionStatusProviderContext";
import { useElection } from "@/hooks/election/useElection";
import { t } from "@/i18n/translate";
import type {
  DataEntryGetDifferencesResponse,
  DataEntryStatusName,
  DataEntryStatusResponse,
  ElectionWithPoliticalGroups,
  POLLING_STATION_DATA_ENTRY_GET_DIFFERENCES_REQUEST_PATH,
  POLLING_STATION_DATA_ENTRY_RESOLVE_DIFFERENCES_REQUEST_BODY,
  POLLING_STATION_DATA_ENTRY_RESOLVE_DIFFERENCES_REQUEST_PATH,
  PollingStation,
  ResolveDifferencesAction,
} from "@/types/generated/openapi";
import type { DataEntryStructure } from "@/types/types";
import { getDataEntryStructure } from "@/utils/dataEntryStructure";

interface PollingStationDataEntryDifferences {
  action: ResolveDifferencesAction | undefined;
  setAction: (action: ResolveDifferencesAction | undefined) => void;
  pollingStation: PollingStation;
  election: ElectionWithPoliticalGroups;
  loading: boolean;
  differences: DataEntryGetDifferencesResponse | null;
  dataEntryStructure: DataEntryStructure | null;
  onSubmit: () => Promise<void>;
  validationError: string | undefined;
}

export function usePollingStationDataEntryDifferences(
  pollingStationId: number,
  afterSave: (status: DataEntryStatusName, firstEntryUserId: number | undefined) => void,
): PollingStationDataEntryDifferences {
  const client = useApiClient();
  const { election, pollingStations } = useElection();
  const pollingStation = pollingStations.find((ps) => ps.id === pollingStationId);
  const [action, setAction] = useState<ResolveDifferencesAction>();
  const electionContext = useContext(ElectionStatusProviderContext);
  const [error, setError] = useState<AnyApiError | null>(null);
  const [validationError, setValidationError] = useState<string>();

  const path: POLLING_STATION_DATA_ENTRY_GET_DIFFERENCES_REQUEST_PATH = `/api/polling_stations/${pollingStationId}/data_entries/resolve_differences`;
  const { requestState } = useInitialApiGet<DataEntryGetDifferencesResponse>(path);

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

  let differences = null;
  let dataEntryStructure = null;
  if (requestState.status === "success") {
    differences = requestState.data;
    dataEntryStructure = getDataEntryStructure(differences.first_entry.model, election);
  }

  const onSubmit = async () => {
    if (action === undefined) {
      setValidationError(t("resolve_differences.required_error"));
      return;
    } else {
      setValidationError(undefined);
    }

    const path: POLLING_STATION_DATA_ENTRY_RESOLVE_DIFFERENCES_REQUEST_PATH = `/api/polling_stations/${pollingStationId}/data_entries/resolve_differences`;
    const body: POLLING_STATION_DATA_ENTRY_RESOLVE_DIFFERENCES_REQUEST_BODY = action;
    const response = await client.postRequest<DataEntryStatusResponse>(path, body);

    if (isSuccess(response)) {
      // reload the election status data then navigate according to new status
      await electionContext?.refetch();
      let firstEntryUserId;
      if (differences && action === "keep_first_entry") {
        firstEntryUserId = differences.first_entry_user_id;
      } else if (differences && action === "keep_second_entry") {
        firstEntryUserId = differences.second_entry_user_id;
      }
      afterSave(response.data.status, firstEntryUserId);
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
    differences,
    dataEntryStructure,
    onSubmit,
    validationError,
  };
}

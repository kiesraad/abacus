import { useContext, useState } from "react";
import { useNavigate } from "react-router";

import { type AnyApiError, isSuccess } from "@/api/ApiResult";
import { useApiClient } from "@/api/useApiClient";
import { useInitialApiGet } from "@/api/useInitialApiGet";
import { ElectionStatusProviderContext } from "@/hooks/election/ElectionStatusProviderContext";
import { useElection } from "@/hooks/election/useElection";
import { t } from "@/i18n/translate";
import type {
  DATA_ENTRY_GET_REQUEST_PATH,
  DATA_ENTRY_RESOLVE_ERRORS_REQUEST_BODY,
  DATA_ENTRY_RESOLVE_ERRORS_REQUEST_PATH,
  DataEntryGetResponse,
  ElectionWithPoliticalGroups,
  ResolveErrorsAction,
} from "@/types/generated/openapi";

interface DataEntryErrors {
  action: ResolveErrorsAction | undefined;
  setAction: (action: ResolveErrorsAction | undefined) => void;
  election: ElectionWithPoliticalGroups;
  loading: boolean;
  dataEntry: DataEntryGetResponse | null;
  onSubmit: (afterSave: (action: ResolveErrorsAction) => void) => Promise<void>;
  validationError: string | undefined;
}

export function useDataEntryErrors(dataEntryId: number): DataEntryErrors {
  const navigate = useNavigate();
  const client = useApiClient();
  const { election } = useElection();
  const [action, setAction] = useState<ResolveErrorsAction>();
  const electionContext = useContext(ElectionStatusProviderContext);
  const [error, setError] = useState<AnyApiError | null>(null);
  const [validationError, setValidationError] = useState<string>();

  // fetch the data entry with errors and warnings
  const path: DATA_ENTRY_GET_REQUEST_PATH = `/api/data_entries/${dataEntryId}/get`;
  const { requestState } = useInitialApiGet<DataEntryGetResponse>(path);

  // propagate error that occurred during a save request
  if (error) {
    throw error;
  }

  // render generic error page when any error occurs
  if (requestState.status === "api-error") {
    if (requestState.error.reference === "DataEntryGetNotAllowed") {
      void navigate(`/elections/${election.id}/status`);
    } else {
      throw requestState.error;
    }
  }

  const onSubmit = async (afterSave: (action: ResolveErrorsAction) => void) => {
    if (action === undefined) {
      setValidationError(t("resolve_differences.required_error"));
      return;
    } else {
      setValidationError(undefined);
    }

    const path: DATA_ENTRY_RESOLVE_ERRORS_REQUEST_PATH = `/api/data_entries/${dataEntryId}/resolve_errors`;
    const body: DATA_ENTRY_RESOLVE_ERRORS_REQUEST_BODY = action;
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
    election,
    loading: requestState.status === "loading",
    dataEntry: requestState.status === "success" ? requestState.data : null,
    onSubmit,
    validationError,
  };
}

import { useContext, useState } from "react";

import { type AnyApiError, isSuccess } from "@/api/ApiResult";
import { useApiClient } from "@/api/useApiClient";
import { useInitialApiGet } from "@/api/useInitialApiGet";
import { ElectionStatusProviderContext } from "@/hooks/election/ElectionStatusProviderContext";
import { useElection } from "@/hooks/election/useElection";
import type {
  DATA_ENTRY_GET_DIFFERENCES_REQUEST_PATH,
  DATA_ENTRY_RESOLVE_DIFFERENCES_REQUEST_BODY,
  DATA_ENTRY_RESOLVE_DIFFERENCES_REQUEST_PATH,
  DataEntryGetDifferencesResponse,
  DataEntryStatusName,
  DataEntryStatusResponse,
  ElectionWithPoliticalGroups,
} from "@/types/generated/openapi";
import type { DataEntryStructure } from "@/types/types";
import { getDataEntryStructure } from "@/utils/dataEntryStructure";

import {
  type CorrectEntry,
  effectiveWrongEntryAction,
  getQuestionErrors,
  getResolveDifferencesAction,
  type ResolveDifferencesFormState,
  type WrongEntryAction,
} from "../utils/differences";

interface DataEntryDifferences {
  formState: ResolveDifferencesFormState;
  election: ElectionWithPoliticalGroups;
  loading: boolean;
  differences: DataEntryGetDifferencesResponse | null;
  dataEntryStructure: DataEntryStructure | null;
  onSubmit: () => Promise<void>;
}

// What happened to the two entries, used to pick the right success message.
export interface ResolveOutcome {
  wrongEntryAction: WrongEntryAction | undefined;
  keptUserId: number | undefined;
  wrongUserId: number | undefined;
}

// The typists of the kept and wrong entries, used to name who kept and who corrects each entry.
function resolvedUserIds(
  differences: DataEntryGetDifferencesResponse | null,
  correctEntry: CorrectEntry | undefined,
): { keptUserId: number | undefined; wrongUserId: number | undefined } {
  if (differences && correctEntry === "first") {
    return { keptUserId: differences.first_entry_user_id, wrongUserId: differences.second_entry_user_id };
  }
  if (differences && correctEntry === "second") {
    return { keptUserId: differences.second_entry_user_id, wrongUserId: differences.first_entry_user_id };
  }
  return { keptUserId: undefined, wrongUserId: undefined };
}

export function useDataEntryDifferences(
  dataEntryId: number,
  afterSave: (status: DataEntryStatusName, outcome: ResolveOutcome) => void,
): DataEntryDifferences {
  const client = useApiClient();
  const { election } = useElection();
  const [correctEntry, setCorrectEntryAnswer] = useState<CorrectEntry>();
  const [wrongEntryAction, setWrongEntryAction] = useState<WrongEntryAction>();
  const electionContext = useContext(ElectionStatusProviderContext);
  const [error, setError] = useState<AnyApiError | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const path: DATA_ENTRY_GET_DIFFERENCES_REQUEST_PATH = `/api/data_entries/${dataEntryId}/resolve_differences`;
  const { requestState } = useInitialApiGet<DataEntryGetDifferencesResponse>(path);

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

  // Block correction of first entry when second entry has errors
  const correctionBlocked = correctEntry === "second" && (differences?.second_entry_has_errors ?? false);
  const effectiveAction = effectiveWrongEntryAction(correctEntry, wrongEntryAction, correctionBlocked);

  const questionErrors = getQuestionErrors(correctEntry, effectiveAction, submitted);

  const onSubmit = async () => {
    setSubmitted(true);

    const action = getResolveDifferencesAction(correctEntry, effectiveAction);
    if (action === undefined) {
      return;
    }

    const path: DATA_ENTRY_RESOLVE_DIFFERENCES_REQUEST_PATH = `/api/data_entries/${dataEntryId}/resolve_differences`;
    const body: DATA_ENTRY_RESOLVE_DIFFERENCES_REQUEST_BODY = action;
    const response = await client.postRequest<DataEntryStatusResponse>(path, body);

    if (isSuccess(response)) {
      // reload the election status data then navigate according to new status
      await electionContext?.refetch();
      afterSave(response.data.status, {
        wrongEntryAction: effectiveAction,
        ...resolvedUserIds(differences, correctEntry),
      });
    } else {
      setError(response);
    }
  };

  return {
    formState: {
      correctEntry,
      // Answering the first question clears the second question
      setCorrectEntry: (next) => {
        setCorrectEntryAnswer(next);
        setWrongEntryAction(undefined);
      },
      wrongEntryAction,
      setWrongEntryAction,
      correctionBlocked,
      ...questionErrors,
    },
    election,
    loading: requestState.status === "loading",
    differences,
    dataEntryStructure,
    onSubmit,
  };
}

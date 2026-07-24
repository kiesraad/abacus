import { useContext, useState } from "react";

import { type AnyApiError, isSuccess } from "@/api/ApiResult";
import { useApiClient } from "@/api/useApiClient";
import { useInitialApiGet } from "@/api/useInitialApiGet";
import { ElectionStatusProviderContext } from "@/hooks/election/ElectionStatusProviderContext";
import { useElection } from "@/hooks/election/useElection";
import { t } from "@/i18n/translate";
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
  getResolveDifferencesAction,
  getUnansweredQuestions,
  type WrongEntryAction,
} from "../utils/differences";

interface DataEntryDifferences {
  correctEntry: CorrectEntry | undefined;
  setCorrectEntry: (correctEntry: CorrectEntry) => void;
  wrongEntryAction: WrongEntryAction | undefined;
  setWrongEntryAction: (wrongEntryAction: WrongEntryAction) => void;
  correctEntryError: string | undefined;
  wrongEntryError: string | undefined;
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

// The typist of the entry that is kept, used to pick a different typist for the re-entry.
function keptEntryUserId(
  differences: DataEntryGetDifferencesResponse | null,
  correctEntry: CorrectEntry | undefined,
): number | undefined {
  if (!differences) return undefined;
  if (correctEntry === "first") return differences.first_entry_user_id;
  if (correctEntry === "second") return differences.second_entry_user_id;
  return undefined;
}

// The typist of the entry that does not match, used to name who corrects it.
function wrongEntryUserId(
  differences: DataEntryGetDifferencesResponse | null,
  correctEntry: CorrectEntry | undefined,
): number | undefined {
  if (!differences) return undefined;
  if (correctEntry === "first") return differences.second_entry_user_id;
  if (correctEntry === "second") return differences.first_entry_user_id;
  return undefined;
}

export function useDataEntryDifferences(
  dataEntryId: number,
  afterSave: (status: DataEntryStatusName, outcome: ResolveOutcome) => void,
): DataEntryDifferences {
  const client = useApiClient();
  const { election } = useElection();
  const [correctEntry, setCorrectEntry] = useState<CorrectEntry>();
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

  const unanswered = getUnansweredQuestions(correctEntry, wrongEntryAction);
  const requiredError = t("resolve_differences.required_error");

  const onSubmit = async () => {
    setSubmitted(true);

    const action = getResolveDifferencesAction(correctEntry, wrongEntryAction);
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
        wrongEntryAction,
        keptUserId: keptEntryUserId(differences, correctEntry),
        wrongUserId: wrongEntryUserId(differences, correctEntry),
      });
    } else {
      setError(response);
    }
  };

  return {
    correctEntry,
    setCorrectEntry,
    wrongEntryAction,
    setWrongEntryAction,
    correctEntryError: submitted && unanswered.correctEntry ? requiredError : undefined,
    wrongEntryError: submitted && unanswered.wrongEntry ? requiredError : undefined,
    election,
    loading: requestState.status === "loading",
    differences,
    dataEntryStructure,
    onSubmit,
  };
}

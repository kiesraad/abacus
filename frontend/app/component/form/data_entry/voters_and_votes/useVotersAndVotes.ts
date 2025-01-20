import { useEffect, useRef, useState } from "react";

import { useFormKeyboardNavigation } from "@kiesraad/ui";
import { deepEqual } from "@kiesraad/util";

import { getErrorsAndWarnings } from "../state/dataEntryUtils";
import { SubmitCurrentFormOptions } from "../state/types";
import { useDataEntryContext } from "../state/useDataEntryContext";
import {
  formValuesToValues,
  valuesToFormValues,
  VotersAndVotesFormValues,
  VotersAndVotesValues,
} from "./votersAndVotesValues";

export function useVotersAndVotes() {
  const { cache, status, pollingStationResults, formState, onSubmitForm } = useDataEntryContext({
    id: "voters_votes_counts",
    type: "voters_and_votes",
  });

  // local form state
  const defaultValues =
    cache?.key === "voters_votes_counts"
      ? (cache.data as VotersAndVotesFormValues)
      : valuesToFormValues({
          voters_counts: pollingStationResults.voters_counts,
          votes_counts: pollingStationResults.votes_counts,
          voters_recounts: pollingStationResults.voters_recounts || undefined,
        });
  const [currentValues, setCurrentValues] = useState<VotersAndVotesFormValues>(defaultValues);
  const [acceptWarnings, setAcceptWarnings] = useState(false);
  const [warningsWarning, setWarningsWarning] = useState(false);

  // derived state
  const { errors, warnings, isSaved } = formState.sections.voters_votes_counts;
  const hasChanges = warnings.length > 0 && isSaved && !deepEqual(currentValues, defaultValues);
  const hasValidationError = errors.length > 0;
  const hasValidationWarning = warnings.length > 0;
  const showAcceptWarnings = errors.length === 0 && warnings.length > 0;
  const defaultProps = {
    errorsAndWarnings: isSaved ? getErrorsAndWarnings(errors, warnings) : undefined,
    warningsAccepted: acceptWarnings,
  };

  // form keyboard navigation
  const formRef = useRef<HTMLFormElement>(null);
  useFormKeyboardNavigation(formRef);

  // submit and save to form contents
  const onSubmit = async (options?: SubmitCurrentFormOptions): Promise<boolean> => {
    const data: VotersAndVotesValues = formValuesToValues(currentValues, pollingStationResults.recounted || false);
    if (!hasValidationError && hasValidationWarning) {
      if (!hasChanges && !acceptWarnings) {
        setWarningsWarning(true);
        return false;
      } else {
        return await onSubmitForm(data, { acceptWarnings, ...options });
      }
    }

    return await onSubmitForm(data);
  };

  // scroll to top when saved
  useEffect(() => {
    if (isSaved) {
      window.scrollTo(0, 0);
    }
  }, [isSaved]);

  return {
    formRef,
    onSubmit,
    pollingStationResults,
    currentValues,
    setCurrentValues,
    errors,
    hasChanges,
    hasValidationError,
    warnings,
    hasValidationWarning,
    isSaving: status === "saving",
    isSaved,
    acceptWarnings,
    setAcceptWarnings,
    showAcceptWarnings,
    warningsWarning,
    defaultProps,
  };
}

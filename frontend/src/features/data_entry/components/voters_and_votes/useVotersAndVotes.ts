import { useEffect, useRef, useState } from "react";

import { useFormKeyboardNavigation } from "@/components/ui";
import { getErrorsAndWarnings } from "@/features/data_entry/stores/dataEntryUtils";
import { SubmitCurrentFormOptions } from "@/features/data_entry/stores/types";
import { useDataEntryContext } from "@/features/data_entry/stores/useDataEntryContext";

import {
  formValuesToValues,
  valuesToFormValues,
  VotersAndVotesFormValues,
  VotersAndVotesValues,
} from "./votersAndVotesValues";

export function useVotersAndVotes() {
  const { error, cache, status, pollingStationResults, formState, onSubmitForm, updateFormSection } =
    useDataEntryContext({
      id: "voters_votes_counts",
      type: "voters_and_votes",
    });

  // local form state
  const defaultValues =
    cache?.key === "voters_votes_counts"
      ? (cache.data as VotersAndVotesValues)
      : {
          voters_counts: pollingStationResults.voters_counts,
          votes_counts: pollingStationResults.votes_counts,
          voters_recounts: pollingStationResults.voters_recounts || undefined,
        };

  const [currentValues, setCurrentValues] = useState<VotersAndVotesFormValues>(valuesToFormValues(defaultValues));

  // derived state
  const { errors, warnings, isSaved, acceptWarnings, hasChanges } = formState.sections.voters_votes_counts;
  const defaultProps = {
    errorsAndWarnings: isSaved ? getErrorsAndWarnings(errors, warnings) : undefined,
    warningsAccepted: acceptWarnings,
  };
  const formSection = formState.sections.voters_votes_counts;
  const showAcceptWarnings = formSection.warnings.length > 0 && formSection.errors.length === 0 && !hasChanges;

  // register changes when fields change
  const setValues = (values: VotersAndVotesFormValues) => {
    if (!hasChanges) {
      updateFormSection({ hasChanges: true, acceptWarnings: false, acceptWarningsError: false });
    }
    setCurrentValues(values);
  };

  const setAcceptWarnings = (acceptWarnings: boolean) => {
    updateFormSection({ acceptWarningsError: false, acceptWarnings });
  };

  // form keyboard navigation
  const formRef = useRef<HTMLFormElement>(null);
  useFormKeyboardNavigation(formRef);

  // submit and save to form contents
  const onSubmit = async (options?: SubmitCurrentFormOptions): Promise<boolean> => {
    const data: VotersAndVotesValues = formValuesToValues(currentValues, pollingStationResults.recounted || false);

    return await onSubmitForm(data, { ...options, showAcceptWarnings });
  };

  // scroll to top when saved
  useEffect(() => {
    if (isSaved || error) {
      window.scrollTo(0, 0);
    }
  }, [isSaved, error]);

  return {
    error,
    formRef,
    onSubmit,
    pollingStationResults,
    currentValues,
    formSection,
    setValues,
    status,
    setAcceptWarnings,
    defaultProps,
    showAcceptWarnings,
  };
}

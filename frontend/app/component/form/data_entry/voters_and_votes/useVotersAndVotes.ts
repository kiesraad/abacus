import { useEffect, useRef, useState } from "react";

import { useFormKeyboardNavigation } from "@kiesraad/ui";

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
  const { cache, status, pollingStationResults, formState, onSubmitForm, updateFormSection } = useDataEntryContext({
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

  // register changes when fields change
  const setValues = (values: VotersAndVotesFormValues) => {
    if (!hasChanges) {
      updateFormSection({ hasChanges: true, acceptWarnings: false, acceptWarningsError: false });
    }
    setCurrentValues(values);
  };

  const setAcceptWarnings = (acceptWarnings: boolean) => {
    updateFormSection({ acceptWarnings });
  };

  // form keyboard navigation
  const formRef = useRef<HTMLFormElement>(null);
  useFormKeyboardNavigation(formRef);

  // submit and save to form contents
  const onSubmit = async (options?: SubmitCurrentFormOptions): Promise<boolean> => {
    const data: VotersAndVotesValues = formValuesToValues(currentValues, pollingStationResults.recounted || false);
    return await onSubmitForm(data, options);
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
    formSection: formState.sections.voters_votes_counts,
    setValues,
    status,
    setAcceptWarnings,
    defaultProps,
  };
}

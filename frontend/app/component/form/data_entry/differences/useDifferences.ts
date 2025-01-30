import { useEffect, useRef, useState } from "react";

import { useFormKeyboardNavigation } from "@kiesraad/ui";

import { getErrorsAndWarnings } from "../state/dataEntryUtils";
import { SubmitCurrentFormOptions } from "../state/types";
import { useDataEntryContext } from "../state/useDataEntryContext";
import { DifferencesFormValues, DifferencesValues, formValuesToValues, valuesToFormValues } from "./differencesValues";

export function useDifferences() {
  const { cache, status, pollingStationResults, formState, onSubmitForm, updateFormSection } = useDataEntryContext({
    id: "differences_counts",
    type: "differences",
  });

  // local form state
  const defaultValues =
    cache?.key === "voters_votes_counts" ? (cache.data as DifferencesValues) : pollingStationResults.differences_counts;

  const [currentValues, setCurrentValues] = useState<DifferencesFormValues>(valuesToFormValues(defaultValues));

  // derived state
  const { errors, warnings, isSaved, acceptWarnings, hasChanges } = formState.sections.voters_votes_counts;
  const defaultProps = {
    errorsAndWarnings: isSaved ? getErrorsAndWarnings(errors, warnings) : undefined,
    warningsAccepted: acceptWarnings,
  };

  // register changes when fields change
  const setValues = (values: DifferencesFormValues) => {
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
    const data: DifferencesValues = formValuesToValues(currentValues);

    return await onSubmitForm(
      {
        differences_counts: data,
      },
      options,
    );
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

import { useEffect, useRef, useState } from "react";

import { useFormKeyboardNavigation } from "@kiesraad/ui";

import { getErrorsAndWarnings } from "../state/dataEntryUtils";
import { SubmitCurrentFormOptions } from "../state/types";
import { useDataEntryContext } from "../state/useDataEntryContext";
import { DifferencesFormValues, DifferencesValues, formValuesToValues, valuesToFormValues } from "./differencesValues";

export function useDifferences() {
  const { error, cache, status, pollingStationResults, formState, onSubmitForm, updateFormSection } =
    useDataEntryContext({
      id: "differences_counts",
      type: "differences",
    });

  // local form state
  const defaultValues =
    cache?.key === "differences_counts" ? (cache.data as DifferencesValues) : pollingStationResults.differences_counts;

  const [currentValues, setCurrentValues] = useState<DifferencesFormValues>(valuesToFormValues(defaultValues));

  // derived state
  const { errors, warnings, isSaved, acceptWarnings, hasChanges } = formState.sections.differences_counts;
  const defaultProps = {
    errorsAndWarnings: isSaved ? getErrorsAndWarnings(errors, warnings) : undefined,
    warningsAccepted: acceptWarnings,
  };
  const formSection = formState.sections.differences_counts;
  const showAcceptWarnings = formSection.warnings.length > 0 && formSection.errors.length === 0 && !hasChanges;

  // register changes when fields change
  const setValues = (values: DifferencesFormValues) => {
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
    const data: DifferencesValues = formValuesToValues(currentValues);

    return await onSubmitForm(
      {
        differences_counts: data,
      },
      { ...options, showAcceptWarnings },
    );
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
    formSection: formState.sections.differences_counts,
    setValues,
    status,
    setAcceptWarnings,
    defaultProps,
    showAcceptWarnings,
  };
}

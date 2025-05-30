import * as React from "react";

import { PollingStationResults } from "@/types/generated/openapi";
import { FormSectionId } from "@/types/types";

import { SubmitCurrentFormOptions, TemporaryCache } from "../types/types";
import { mapValidationResultsToFields } from "../utils/ValidationResults";
import { useDataEntryContext } from "./useDataEntryContext";
import { useFormKeyboardNavigation } from "./useFormKeyboardNavigation";

export interface UseDataEntryFormSectionParams<FORM_VALUES> {
  getDefaultFormValues: (results: PollingStationResults, cache?: TemporaryCache | null) => FORM_VALUES;
  section: FormSectionId;
}

export function useDataEntryFormSection<FORM_VALUES>({
  getDefaultFormValues,
  section,
}: UseDataEntryFormSectionParams<FORM_VALUES>) {
  const { error, cache, status, pollingStationResults, formState, onSubmitForm, updateFormSection } =
    useDataEntryContext(section);

  //local form state
  const [currentValues, setCurrentValues] = React.useState<FORM_VALUES>(
    getDefaultFormValues(pollingStationResults, cache),
  );

  // derived state
  const formSection = formState.sections[section];
  if (!formSection) {
    throw new Error(`Form section ${section} not found in form state`);
  }
  const { errors, warnings, isSaved, acceptErrorsAndWarnings, hasChanges } = formSection;
  const defaultProps = {
    errorsAndWarnings: isSaved ? mapValidationResultsToFields(errors, warnings) : undefined,
    errorsAndWarningsAccepted: acceptErrorsAndWarnings,
  };

  const showAcceptErrorsAndWarnings = (!formSection.warnings.isEmpty() || !formSection.errors.isEmpty()) && !hasChanges;

  // register changes when fields change
  const setValues = (values: FORM_VALUES) => {
    if (!hasChanges) {
      updateFormSection({ hasChanges: true, acceptErrorsAndWarnings: false, acceptErrorsAndWarningsError: false });
    }
    setCurrentValues(values);
  };

  const setAcceptErrorsAndWarnings = (acceptErrorsAndWarnings: boolean) => {
    updateFormSection({ acceptErrorsAndWarnings });
  };

  // form keyboard navigation
  const formRef = useFormKeyboardNavigation();

  // submit and save to form contents
  const onSubmit = async (
    data: Partial<PollingStationResults>,
    options?: SubmitCurrentFormOptions,
  ): Promise<boolean> => {
    const result = await onSubmitForm(data, { ...options, showAcceptErrorsAndWarnings });
    return result;
  };

  // scroll to top when saved
  React.useEffect(() => {
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
    setAcceptErrorsAndWarnings,
    defaultProps,
    showAcceptErrorsAndWarnings,
    isSaving: status === "saving",
  };
}

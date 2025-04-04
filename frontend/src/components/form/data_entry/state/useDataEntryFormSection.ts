import * as React from "react";

import { PollingStationResults } from "@kiesraad/api";
import { useFormKeyboardNavigation } from "@kiesraad/ui";

import { FormSectionId, SubmitCurrentFormOptions, TemporaryCache } from "./types";
import { useDataEntryContext } from "./useDataEntryContext";
import { mapValidationResultsToFields } from "./ValidationResults";

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
  const { errors, warnings, isSaved, acceptWarnings, hasChanges } = formSection;
  const defaultProps = {
    errorsAndWarnings: isSaved ? mapValidationResultsToFields(errors, warnings) : undefined,
    warningsAccepted: acceptWarnings,
  };

  const showAcceptWarnings = !formSection.warnings.isEmpty() && formSection.errors.isEmpty() && !hasChanges;

  // register changes when fields change
  const setValues = (values: FORM_VALUES) => {
    if (!hasChanges) {
      updateFormSection({ hasChanges: true, acceptWarnings: false, acceptWarningsError: false });
    }
    setCurrentValues(values);
  };

  const setAcceptWarnings = (acceptWarnings: boolean) => {
    updateFormSection({ acceptWarnings });
  };

  // form keyboard navigation
  const formRef = React.useRef<HTMLFormElement>(null);
  useFormKeyboardNavigation(formRef);

  // submit and save to form contents
  const onSubmit = async (
    data: Partial<PollingStationResults>,
    options?: SubmitCurrentFormOptions,
  ): Promise<boolean> => {
    const result = await onSubmitForm(data, { ...options, showAcceptWarnings });
    if (!formSection.errors.isEmpty()) {
      // scroll to top when there are errors, this is mainly necessary when users click "volgende" a second time without changing anything
      window.scrollTo(0, 0);
    }
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
    setAcceptWarnings,
    defaultProps,
    showAcceptWarnings,
    isSaving: status === "saving",
  };
}

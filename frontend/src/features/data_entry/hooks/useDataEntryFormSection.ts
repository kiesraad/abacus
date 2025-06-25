import * as React from "react";

import { FormSectionId, SectionValues } from "@/types/types";
import { mapResultsToSectionValues } from "@/utils/dataEntryMapping";
import { mapValidationResultSetsToFields } from "@/utils/ValidationResults";

import { SubmitCurrentFormOptions } from "../types/types";
import { useDataEntryContext } from "./useDataEntryContext";
import { useFormKeyboardNavigation } from "./useFormKeyboardNavigation";

export function useDataEntryFormSection({ section: sectionId }: { section: FormSectionId }) {
  const {
    error,
    cache,
    status,
    pollingStationResults,
    dataEntryStructure,
    formState,
    onSubmitForm,
    updateFormSection,
    election,
  } = useDataEntryContext(sectionId);

  const section = dataEntryStructure.find((s) => s.id === sectionId);

  if (!section) {
    throw new Error(`Form section ${sectionId} not found in data entry structure`);
  }

  // Helper function build currentValues
  const buildCurrentValues = React.useCallback((): SectionValues => {
    if (cache?.key === sectionId) {
      return cache.data;
    } else {
      return mapResultsToSectionValues(section, pollingStationResults);
    }
  }, [cache, sectionId, section, pollingStationResults]);

  // Local form state
  const [currentValues, setCurrentValues] = React.useState<SectionValues>(() => buildCurrentValues());

  // Update currentValues when section changes
  React.useEffect(() => {
    setCurrentValues(buildCurrentValues());
  }, [sectionId, buildCurrentValues]);

  // derived state
  const formSection = formState.sections[sectionId];
  if (!formSection) {
    throw new Error(`Form section ${sectionId} not found in form state`);
  }
  const { errors, warnings, isSaved, acceptErrorsAndWarnings, hasChanges } = formSection;
  const defaultProps = {
    errorsAndWarnings: isSaved ? mapValidationResultSetsToFields(errors, warnings) : undefined,
    errorsAndWarningsAccepted: acceptErrorsAndWarnings,
  };

  const showAcceptErrorsAndWarnings = (!formSection.warnings.isEmpty() || !formSection.errors.isEmpty()) && !hasChanges;

  // register changes when fields change
  const setValues = (path: string, value: string) => {
    if (!hasChanges) {
      updateFormSection({ hasChanges: true, acceptErrorsAndWarnings: false, acceptErrorsAndWarningsError: false });
    }
    setCurrentValues((cv) => {
      cv = structuredClone(cv);
      cv[path] = value;
      return cv;
    });
  };

  const setAcceptErrorsAndWarnings = (acceptErrorsAndWarnings: boolean) => {
    updateFormSection({ acceptErrorsAndWarnings });
  };

  // form keyboard navigation
  const formRef = useFormKeyboardNavigation();

  // submit and save to form contents
  const onSubmit = async (options?: SubmitCurrentFormOptions): Promise<boolean> => {
    return await onSubmitForm(currentValues, { ...options, showAcceptErrorsAndWarnings });
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
    dataEntryStructure,
    formSection,
    setValues,
    status,
    setAcceptErrorsAndWarnings,
    defaultProps,
    showAcceptErrorsAndWarnings,
    isSaving: status === "saving",
    election,
  };
}

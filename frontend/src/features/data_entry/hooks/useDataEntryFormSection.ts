import { useEffect, useState } from "react";
import { useParams } from "react-router";

import type { FormSectionId, SectionValues } from "@/types/types";
import { mapResultsToSectionValues } from "@/utils/dataEntryMapping";
import { mapValidationResultSetsToFields } from "@/utils/ValidationResults";

import type { SubmitCurrentFormOptions } from "../types/types";
import { useDataEntryContext } from "./useDataEntryContext";
import { useFormKeyboardNavigation } from "./useFormKeyboardNavigation";

// biome-ignore lint/complexity/noExcessiveLinesPerFunction: TODO function should be refactored
export function useDataEntryFormSection() {
  const {
    error,
    cache,
    status,
    previousResults,
    results,
    dataEntryStructure,
    formState,
    onSubmitForm,
    updateFormSection,
    election,
  } = useDataEntryContext();

  const params = useParams<{ sectionId: FormSectionId }>();
  const sectionId = params.sectionId ?? null;

  const section = dataEntryStructure.find((s) => s.id === sectionId);

  if (!sectionId || !section) {
    throw new Error(`Form section ${sectionId} not found in data entry structure`);
  }

  const previousValues = previousResults ? mapResultsToSectionValues(section, previousResults) : undefined;

  // Local form state
  const [currentValues, setCurrentValues] = useState<SectionValues>((): SectionValues => {
    if (cache?.key === sectionId) {
      return cache.data;
    } else {
      return mapResultsToSectionValues(section, results);
    }
  });

  // derived state
  const formSection = formState.sections[sectionId];
  if (!formSection) {
    throw new Error(`Form section ${sectionId} not found in form state`);
  }
  const { errors, warnings, isSaved, isSubmitted, acceptErrorsAndWarnings, hasChanges } = formSection;
  const defaultProps = {
    errorsAndWarnings: isSaved ? mapValidationResultSetsToFields(errors, warnings) : undefined,
    errorsAndWarningsAccepted: acceptErrorsAndWarnings,
  };

  // Find error code that is shown on the bottom of the form
  const trailingError = errors.find("F401");

  // Whether to show the accept errors and warnings checkbox
  const showAcceptErrorsAndWarnings = (!formSection.warnings.isEmpty() || !formSection.errors.isEmpty()) && !hasChanges;

  // register changes when fields change
  const setValues = (path: string, value: string) => {
    if (!hasChanges) {
      updateFormSection(sectionId, {
        hasChanges: true,
        acceptErrorsAndWarnings: false,
        acceptErrorsAndWarningsError: false,
      });
    }
    setCurrentValues((cv) => {
      cv = structuredClone(cv);
      cv[path] = value;
      return cv;
    });
  };

  const setAcceptErrorsAndWarnings = (acceptErrorsAndWarnings: boolean) => {
    updateFormSection(sectionId, { acceptErrorsAndWarnings });
  };

  // form keyboard navigation
  const formRef = useFormKeyboardNavigation();

  // submit and save to form contents
  const onSubmit = async (options?: SubmitCurrentFormOptions): Promise<boolean> => {
    return await onSubmitForm(sectionId, currentValues, { ...options, showAcceptErrorsAndWarnings });
  };

  // scroll to top when submitted
  useEffect(() => {
    // If isSubmitted=true and hasChanges=false, the form was just submitted successfully
    const formSubmitted = isSubmitted && !hasChanges;

    if (!trailingError && (formSubmitted || error)) {
      window.scrollTo(0, 0);
    }
  }, [isSubmitted, error, hasChanges, trailingError]);

  return {
    error,
    formRef,
    onSubmit,
    previousValues,
    currentValues,
    formSection,
    setValues,
    setAcceptErrorsAndWarnings,
    defaultProps,
    showAcceptErrorsAndWarnings,
    trailingError,
    isSaving: status === "saving",
    election,
    section,
  };
}

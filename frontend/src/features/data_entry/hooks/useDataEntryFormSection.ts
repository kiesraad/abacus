import * as React from "react";
import { useParams } from "react-router";

import { FormSectionId, SectionValues } from "@/types/types";
import { mapResultsToSectionValues } from "@/utils/dataEntryMapping";
import { mapValidationResultSetsToFields } from "@/utils/ValidationResults";

import { SubmitCurrentFormOptions } from "../types/types";
import { useDataEntryContext } from "./useDataEntryContext";
import { useFormKeyboardNavigation } from "./useFormKeyboardNavigation";

export function useDataEntryFormSection() {
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
  } = useDataEntryContext();

  const params = useParams<{ sectionId: FormSectionId }>();
  const sectionId = params.sectionId ?? null;

  const section = dataEntryStructure.find((s) => s.id === sectionId);

  if (!sectionId || !section) {
    throw new Error(`Form section ${sectionId} not found in data entry structure`);
  }

  // Local form state
  const [currentValues, setCurrentValues] = React.useState<SectionValues>((): SectionValues => {
    if (cache?.key === sectionId) {
      return cache.data;
    } else {
      return mapResultsToSectionValues(section, pollingStationResults);
    }
  });

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
    section,
  };
}

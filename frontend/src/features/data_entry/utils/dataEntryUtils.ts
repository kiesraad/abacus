import type { ValidationResult, ValidationResults } from "@/types/generated/openapi";
import type { DataEntryResults, DataEntrySection, DataEntryStructure, FormSectionId, ResultsPath } from "@/types/types";
import { extractFieldInfoFromSection, getValueAtPath, resetValueAtPath } from "@/utils/dataEntryMapping";
import { doesValidationResultApplyToSection, isFieldInSection, ValidationResultSet } from "@/utils/ValidationResults";
import type { ClientState, FormSection, FormState } from "../types/types";

export function formSectionComplete(section: FormSection): boolean {
  return (
    section.isSaved &&
    (section.errors.isEmpty() || section.acceptErrorsAndWarnings) &&
    (section.warnings.isEmpty() || section.acceptErrorsAndWarnings)
  );
}

export function resetFormSectionState(formState: FormState) {
  Object.values(formState.sections).forEach((section) => {
    // the server response contains the validation results for the entire form, so we can clear the old validation results
    section.errors = new ValidationResultSet();
    section.warnings = new ValidationResultSet();
    section.isSubmitted = undefined;
    section.acceptErrorsAndWarningsError = false;
  });
}

export function getNextSectionID(formState: FormState, currentSectionId: FormSectionId) {
  const currentSection = formState.sections[currentSectionId];

  if (currentSection?.isSubmitted && formSectionComplete(currentSection)) {
    for (const section of Object.values(formState.sections)) {
      if (
        (formState.furthest === "save" && !section.errors.isEmpty() && !section.acceptErrorsAndWarnings) ||
        (section.index > currentSection.index && !section.isDisabled)
      ) {
        return section.id;
      }
    }
  }

  return null;
}

export function isSectionSkipped(section: DataEntrySection, results: DataEntryResults): boolean {
  if (!section.skip_when) {
    return false;
  }

  return getValueAtPath(results, section.skip_when.path) === section.skip_when.equal_to;
}

export function updateSkippedSections(
  formState: FormState,
  dataEntryStructure: DataEntryStructure,
  results: DataEntryResults,
) {
  for (const section of dataEntryStructure) {
    const formSection = formState.sections[section.id];
    if (formSection) {
      formSection.isDisabled = isSectionSkipped(section, results);
    }
  }

  const furthestSection = formState.sections[formState.furthest];
  if (furthestSection?.isDisabled) {
    const nextEnabledSection = Object.values(formState.sections).find(
      (section) => section.index > furthestSection.index && !section.isDisabled,
    );
    if (nextEnabledSection) {
      formState.furthest = nextEnabledSection.id;
    }
  }
}

export function resetSkippedSectionValues(dataEntryStructure: DataEntryStructure, results: DataEntryResults) {
  const fields = dataEntryStructure
    .filter((section) => isSectionSkipped(section, results))
    .flatMap((section) => [...extractFieldInfoFromSection(section).keys()]);

  if (fields.length > 0) {
    resetFieldValues(dataEntryStructure, fields, results);
  }
}

export function isFormSectionEmpty(
  dataEntryStructure: DataEntryStructure,
  section: FormSection,
  results: DataEntryResults,
): boolean {
  const dataEntrySection = dataEntryStructure.find((s) => s.id === section.id);
  if (!dataEntrySection) {
    // If section not found in structure, consider it empty
    return true;
  }

  const fieldInfoMap = extractFieldInfoFromSection(dataEntrySection);
  for (const [path, fieldType] of fieldInfoMap) {
    const value = getValueAtPath(results, path);

    switch (fieldType) {
      case "boolean":
        if (value === true) {
          return false;
        }
        break;
      case "number":
        if (value !== 0 && value !== undefined) {
          return false;
        }
        break;
      case "enum":
        if (value !== null && value !== "") {
          return false;
        }
        break;
    }
  }

  return true;
}

export type DataEntryFormSectionStatus = "empty" | "unaccepted-warnings" | "accepted-warnings" | "errors";

function createFormSection(id: FormSectionId, index: number): FormSection {
  return {
    index,
    id,
    isDisabled: false,
    isSaved: false,
    acceptErrorsAndWarnings: false,
    hasChanges: false,
    acceptErrorsAndWarningsError: false,
    errors: new ValidationResultSet(),
    warnings: new ValidationResultSet(),
  };
}

export function getInitialFormState(dataEntryStructure: DataEntryStructure): FormState {
  const furthest = dataEntryStructure[0]?.id;
  if (furthest === undefined) {
    throw new Error("Cannot determine initial furthest section from dataEntryStructure");
  }

  // Create sections from data entry structure plus save section
  const sections: Record<string, FormSection> = {};

  dataEntryStructure.forEach((section, index) => {
    sections[section.id] = createFormSection(section.id, index);
  });

  sections.save = createFormSection("save", dataEntryStructure.length);

  return { furthest, sections };
}

export function getClientState(
  formState: FormState,
  currentSectionId: FormSectionId,
  acceptErrorsAndWarnings: boolean,
  continueToNextSection: boolean,
) {
  // Collect all the correctionWarning fields from the sections
  const correctionWarnings = Object.values(formState.sections).reduce(
    (warnings: ResultsPath[], section: FormSection) =>
      section.correctionWarning ? warnings.concat(section.correctionWarning.fields) : warnings,
    [],
  );

  const clientState: ClientState = {
    furthest: formState.furthest,
    current: currentSectionId,
    acceptedErrorsAndWarnings: Object.values(formState.sections)
      .filter((s: FormSection) => s.acceptErrorsAndWarnings)
      .filter((s: FormSection) => s.id !== currentSectionId)
      .map((s: FormSection) => s.id),
    continue: continueToNextSection,
    correctionWarnings: correctionWarnings.length > 0 ? correctionWarnings : undefined,
  };
  // the form state is not updated for the current submission,
  // so add the current section to the accepted warnings if needed
  if (acceptErrorsAndWarnings) {
    clientState.acceptedErrorsAndWarnings.push(currentSectionId);
  }
  return clientState;
}

export function calculateDataEntryProgress(formState: FormState) {
  const sections = Object.keys(formState.sections);
  const totalSections = sections.length;

  const furthestSection = formState.sections[formState.furthest];
  if (furthestSection === undefined) {
    console.warn("Furthest could not be found in sections");
    return 0;
  }

  return Math.floor(((furthestSection.index + 1) / totalSections) * 100);
}

export function restoreFormState(
  clientState: ClientState,
  formState: FormState,
  validationResults: ValidationResults,
  dataEntryStructure: DataEntryStructure,
): FormSectionId {
  // set the furthest section
  formState.furthest = clientState.furthest;

  // set accepted warnings
  clientState.acceptedErrorsAndWarnings.forEach((sectionID: FormSectionId) => {
    const section = formState.sections[sectionID];
    if (section) {
      section.acceptErrorsAndWarnings = true;
    }
  });

  // set saved sections to all sections before the furthest section
  const currentIndex = formState.sections[formState.furthest]?.index ?? 0;
  for (const section of Object.values(formState.sections)) {
    if (section.index < currentIndex) {
      section.isSaved = true;
    }
  }

  // Use server's current section for tracking
  const serverCurrentSection = clientState.current;

  // set accepted warnings for the current section
  const acceptErrorsAndWarnings = clientState.acceptedErrorsAndWarnings.some(
    (sectionID: FormSectionId) => sectionID === serverCurrentSection,
  );

  // set correctionWarning on the sections
  if (clientState.correctionWarnings) {
    addCorrectionWarnings(dataEntryStructure, clientState.correctionWarnings, formState);
  }

  updateFormStateAfterSubmit(
    dataEntryStructure,
    formState,
    validationResults,
    serverCurrentSection,
    acceptErrorsAndWarnings,
  );

  if (clientState.continue) {
    return getNextSectionID(formState, serverCurrentSection) ?? serverCurrentSection;
  }

  return serverCurrentSection;
}

/*
 * Build the form state for an entry that is being corrected. The typist starts at the first section and has to
 * accept the errors and warnings again.
 */
export function restoreCorrectionFormState(
  formState: FormState,
  validationResults: ValidationResults,
  dataEntryStructure: DataEntryStructure,
): FormSectionId {
  const firstSectionId = dataEntryStructure[0]?.id;
  if (firstSectionId === undefined) {
    throw new Error("Cannot determine initial section from dataEntryStructure");
  }

  // "save" is the last section
  return restoreFormState(
    { furthest: "save", current: firstSectionId, acceptedErrorsAndWarnings: [], continue: false },
    formState,
    validationResults,
    dataEntryStructure,
  );
}

export function updateFormStateAfterSubmit(
  dataEntryStructure: DataEntryStructure,
  formState: FormState,
  validationResults: ValidationResults,
  sectionId: FormSectionId,
  continueToNextSection: boolean = false,
): FormState {
  resetFormSectionState(formState);

  const currentFormSection = formState.sections[sectionId];
  if (currentFormSection) {
    const saved = formState.furthest !== sectionId || continueToNextSection;
    //store that this section has been sent to the server
    currentFormSection.isSaved = saved;
    //store that this section has been submitted, this resets on each request
    currentFormSection.isSubmitted = saved;
    // There are no changes after a successful submit
    currentFormSection.hasChanges = false;
    // Remove correction warning
    currentFormSection.correctionWarning = undefined;
  }

  //distribute errors and warnings to sections
  addValidationResultsToFormState(validationResults.errors, formState, dataEntryStructure, "errors");
  addValidationResultsToFormState(validationResults.warnings, formState, dataEntryStructure, "warnings");

  //determine the new furthest section, if applicable
  if (continueToNextSection && currentFormSection && formState.furthest === currentFormSection.id) {
    formState.furthest = getNextSectionID(formState, sectionId) ?? formState.furthest;
  }

  return formState;
}

/*
 * Distributes validation results to the corresponding sections in the form state, but only if that section is saved.
 */
export function addValidationResultsToFormState(
  validationResults: ValidationResult[],
  formState: FormState,
  dataEntryStructure: DataEntryStructure,
  errorsOrWarnings: "errors" | "warnings",
) {
  for (const section of dataEntryStructure) {
    const formSection = formState.sections[section.id];
    if (formSection?.isSaved) {
      for (const validationResult of validationResults) {
        if (doesValidationResultApplyToSection(validationResult, section)) {
          formSection[errorsOrWarnings].add(validationResult);
        }
      }
    }
  }
}

export function addCorrectionWarnings(dataEntryStructure: DataEntryStructure, fields: string[], formState: FormState) {
  for (const section of dataEntryStructure) {
    const sectionFields = fields.filter((field) => isFieldInSection(field, section));
    const formSection = formState.sections[section.id];
    if (formSection === undefined || sectionFields.length === 0) {
      continue;
    }

    formSection.correctionWarning = { code: "W002", fields: sectionFields };
  }
}

export function resetFieldValues(dataEntryStructure: DataEntryStructure, fields: string[], results: DataEntryResults) {
  for (const section of dataEntryStructure) {
    const sectionFields = fields.filter((field) => isFieldInSection(field, section));

    for (const field of sectionFields) {
      resetValueAtPath(section, results, field);
    }
  }
}

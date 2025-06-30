import { PollingStationResults, ValidationResult, ValidationResults } from "@/types/generated/openapi";
import { DataEntryStructure, FormSectionId } from "@/types/types";
import { doesValidationResultApplyToSection, ValidationResultSet } from "@/utils/ValidationResults";

import { ClientState, FormSection, FormState } from "../types/types";
import { INITIAL_FORM_SECTION_ID } from "./reducer";

export function objectHasOnlyEmptyValues(obj: Record<string, "" | number>): boolean {
  for (const key in obj) {
    if (obj[key] !== "" && obj[key] !== 0) {
      return false;
    }
  }
  return true;
}

export function formSectionComplete(section: FormSection): boolean {
  return (
    section.isSaved &&
    (section.errors.isEmpty() || section.errors.hasOnlyGlobalValidationResults() || section.acceptErrorsAndWarnings) &&
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

  if (currentSection && currentSection.isSubmitted && formSectionComplete(currentSection)) {
    for (const section of Object.values(formState.sections)) {
      if (
        (formState.furthest === "save" && !section.errors.isEmpty() && !section.acceptErrorsAndWarnings) ||
        section.index === currentSection.index + 1
      ) {
        return section.id;
      }
    }
  }

  return null;
}

export function isFormSectionEmpty(section: FormSection, values: PollingStationResults): boolean {
  if (section.id.startsWith("political_group_votes_")) {
    const index = parseInt(section.id.replace("political_group_votes_", "")) - 1;
    const g = values.political_group_votes[index];
    if (g) {
      if (g.total !== 0) return false;
      for (let i = 0, n = g.candidate_votes.length; i < n; i++) {
        if (g.candidate_votes[i]?.votes !== 0) return false;
      }
    }
  }

  switch (section.id) {
    case "voters_votes_counts":
      return (
        objectHasOnlyEmptyValues({ ...values.votes_counts }) && objectHasOnlyEmptyValues({ ...values.voters_counts })
      );
    case "differences_counts":
      return objectHasOnlyEmptyValues({ ...values.differences_counts });
    case "recounted":
      return values.recounted === undefined;
    default:
      return true;
  }
}

export type DataEntryFormSectionStatus = "empty" | "unaccepted-warnings" | "accepted-warnings" | "errors";
export type DataEntrySummary = {
  countsAddUp: boolean;
  hasBlocks: boolean;
  hasWarnings: boolean;
  hasErrors: boolean;
  notableFormSections: {
    status: DataEntryFormSectionStatus;
    formSection: FormSection;
  }[];
};

function createFormSection(id: FormSectionId, index: number): FormSection {
  return {
    index,
    id,
    isSaved: false,
    acceptErrorsAndWarnings: false,
    hasChanges: false,
    acceptErrorsAndWarningsError: false,
    errors: new ValidationResultSet(),
    warnings: new ValidationResultSet(),
  };
}

export function getInitialFormState(dataEntryStructure: DataEntryStructure): FormState {
  // Create sections from data entry structure plus save section
  const sections: Record<string, FormSection> = {};

  dataEntryStructure.forEach((section, index) => {
    sections[section.id] = createFormSection(section.id, index);
  });

  sections["save"] = createFormSection("save", dataEntryStructure.length);

  return {
    furthest: INITIAL_FORM_SECTION_ID,
    sections: sections as Record<FormSectionId, FormSection>,
  };
}

export function getClientState(
  formState: FormState,
  currentSectionId: FormSectionId,
  acceptErrorsAndWarnings: boolean,
  continueToNextSection: boolean,
) {
  const clientState: ClientState = {
    furthest: formState.furthest,
    current: currentSectionId,
    acceptedErrorsAndWarnings: Object.values(formState.sections)
      .filter((s: FormSection) => s.acceptErrorsAndWarnings)
      .filter((s: FormSection) => s.id !== currentSectionId)
      .map((s: FormSection) => s.id),
    continue: continueToNextSection,
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

  return Math.round(((furthestSection.index + 1) / totalSections) * 100);
}

export function buildFormState(
  clientState: ClientState,
  validationResults: ValidationResults,
  dataEntryStructure: DataEntryStructure,
) {
  const newFormState = getInitialFormState(dataEntryStructure);

  // set the furthest section
  newFormState.furthest = clientState.furthest;

  // set accepted warnings
  clientState.acceptedErrorsAndWarnings.forEach((sectionID: FormSectionId) => {
    const section = newFormState.sections[sectionID];
    if (section) {
      section.acceptErrorsAndWarnings = true;
    }
  });

  // set saved sections to all sections before the furthest section
  const currentIndex = newFormState.sections[newFormState.furthest]?.index ?? 0;
  for (const section of Object.values(newFormState.sections)) {
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

  updateFormStateAfterSubmit(
    dataEntryStructure,
    newFormState,
    validationResults,
    serverCurrentSection,
    acceptErrorsAndWarnings,
  );

  let targetFormSectionId: FormSectionId;
  if (clientState.continue) {
    targetFormSectionId = getNextSectionID(newFormState, serverCurrentSection) ?? serverCurrentSection;
  } else {
    targetFormSectionId = serverCurrentSection;
  }

  return { formState: newFormState, targetFormSectionId };
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
  }

  //distribute errors and warnings to sections
  addValidationResultsToFormState(validationResults.errors, formState, dataEntryStructure, "errors");
  addValidationResultsToFormState(validationResults.warnings, formState, dataEntryStructure, "warnings");

  //determine the new furthest section, if applicable
  if (continueToNextSection && currentFormSection && formState.furthest === currentFormSection.id) {
    formState.furthest = getNextSectionID(formState, sectionId) ?? formState.furthest;
  }

  if (formState.furthest !== "save") {
    //if the entire form is not completed yet, filter out global validation results since they don't have meaning yet.
    Object.values(formState.sections).forEach((section) => {
      section.errors.removeGlobalValidationResults();
      section.warnings.removeGlobalValidationResults();
    });
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
    if (formSection && formSection.isSaved) {
      for (const validationResult of validationResults) {
        if (doesValidationResultApplyToSection(validationResult, section)) {
          formSection[errorsOrWarnings].add(validationResult);
        }
      }
    }
  }
}

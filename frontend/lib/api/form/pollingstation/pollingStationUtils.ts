import { ErrorsAndWarnings, FieldValidationResult } from "lib/api/api";

import { ValidationResult } from "@kiesraad/api";
import { ValidationResultType } from "@kiesraad/ui";
import { deepEqual, fieldNameFromPath, FieldSection, objectHasOnlyEmptyValues, rootFieldSection } from "@kiesraad/util";

import {
  AnyFormReference,
  ClientValidationResult,
  FormSection,
  FormSectionID,
  FormState,
  PollingStationValues,
} from "./PollingStationFormController";
import { DifferencesValues } from "./useDifferences";
import { RecountedValue } from "./useRecounted";
import { VotersAndVotesValues } from "./useVotersAndVotes";

function checkAndAddValidationResult(
  section: FormSection,
  target: ValidationResultType,
  validationResult: ValidationResult,
) {
  //don't add errors and warnings to the form state if the section is not saved
  if (section.isSaved) {
    //don't add a duplicate validation result to the form state
    if (!section[target].includes(validationResult)) {
      section[target].push(validationResult);
    }
  }
}

export function addValidationResultToFormState(
  formState: FormState,
  arr: ValidationResult[],
  target: ValidationResultType,
) {
  arr.forEach((validationResult) => {
    const uniqueRootSections = uniqueFieldSections(validationResult.fields);

    uniqueRootSections.forEach((fieldSection) => {
      const { name: rootSection, index } = fieldSection;
      switch (rootSection) {
        case "votes_counts":
        case "voters_counts":
        case "voters_recounts":
          checkAndAddValidationResult(formState.sections.voters_votes_counts, target, validationResult);
          break;
        case "differences_counts":
          checkAndAddValidationResult(formState.sections.differences_counts, target, validationResult);
          break;
        case "political_group_votes":
          if (index !== undefined) {
            const sectionKey = `political_group_votes_${index + 1}` as FormSectionID;
            const section = formState.sections[sectionKey];
            if (section) {
              checkAndAddValidationResult(section, target, validationResult);
            }
          }
          break;
        default:
          formState.unknown[target].push(validationResult);
          break;
      }
    });
  });
}

export function uniqueFieldSections(fields: string[]): FieldSection[] {
  const result: FieldSection[] = [];

  fields.forEach((field) => {
    const rootSection = rootFieldSection(field);
    if (result.findIndex((s) => s.name === rootSection.name && s.index === rootSection.index) === -1) {
      result.push(rootSection);
    }
  });

  return result;
}

export function formSectionComplete(section: FormSection): boolean {
  if (section.isSaved) {
    if (section.errors.length === 0 || hasOnlyGlobalValidationResults(section.errors)) {
      if (section.warnings.length === 0 || section.ignoreWarnings) {
        return true;
      }
    }
  }
  return false;
}

export function hasOnlyGlobalValidationResults(arr: ClientValidationResult[]): boolean {
  return arr.every((result) => isGlobalValidationResult(result));
}

//get the next section in the form based on index
export function getNextSection(formState: FormState, currentSection: FormSection): FormSectionID | null {
  for (const section of Object.values(formState.sections)) {
    if (formState.isCompleted && section.errors.length > 0) {
      return section.id;
    }
    if (section.index === currentSection.index + 1) {
      return section.id;
    }
  }

  return null;
}

export function resetFormSectionState(formState: FormState) {
  Object.values(formState.sections).forEach((section) => {
    section.errors = [];
    section.warnings = [];
    section.isSubmitted = undefined;
  });
  formState.unknown.errors = [];
  formState.unknown.warnings = [];
}

export function currentFormHasChanges(currentForm: AnyFormReference, values: PollingStationValues): boolean {
  if (currentForm.type === "recounted") {
    const valA: RecountedValue = { recounted: values.recounted };
    const valB = currentForm.getValues();
    return !deepEqual(valA, valB);
  }

  if (currentForm.type === "voters_and_votes") {
    const valA: VotersAndVotesValues = {
      voters_counts: values.voters_counts,
      votes_counts: values.votes_counts,
      voters_recounts: values.voters_recounts,
    };
    const valB = currentForm.getValues();
    return !deepEqual(valA, valB, true);
  }

  if (currentForm.type === "differences") {
    const valA: DifferencesValues = {
      differences_counts: values.differences_counts,
    };
    const valB = currentForm.getValues();
    return !deepEqual(valA, valB, true);
  }

  if (currentForm.type === "save") {
    return false;
  }

  //political_group_votes
  const valA = values.political_group_votes.find((pg) => pg.number === currentForm.number);
  if (valA) {
    const valB = currentForm.getValues();
    return !deepEqual(valA, valB, true);
  }

  return false;
}

export function isGlobalValidationResult(validationResult: ValidationResult): boolean {
  switch (validationResult.code) {
    case "F204":
      return true;
    default:
      return false;
  }
}

//transform a form sections errors and warnings into a map of field ids and their errors and warnings
export function getErrorsAndWarnings(
  errors: ValidationResult[],
  warnings: ValidationResult[],
  clientWarnings: FieldValidationResult[],
): Map<string, ErrorsAndWarnings> {
  const result = new Map<string, ErrorsAndWarnings>();

  const process = (target: keyof ErrorsAndWarnings, arr: ValidationResult[]) => {
    arr.forEach((v) => {
      v.fields.forEach((f) => {
        const fieldName = fieldNameFromPath(f);
        if (!result.has(fieldName)) {
          result.set(fieldName, { errors: [], warnings: [] });
        }
        const field = result.get(fieldName);
        if (field) {
          field[target].push({
            code: v.code,
            id: fieldName,
          });
        }
      });
    });
  };

  if (errors.length > 0) {
    process("errors", errors);
  } else if (warnings.length > 0) {
    // only process warnings if there are no errors
    process("warnings", warnings);
  }

  clientWarnings.forEach((warning) => {
    if (!result.has(warning.id)) {
      result.set(warning.id, { errors: [], warnings: [] });
    }
    const field = result.get(warning.id);
    if (field) {
      field.warnings.push(warning);
    }
  });

  return result;
}

export function isFormSectionEmpty(section: FormSection, values: PollingStationValues): boolean {
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

export type PollingStationFormSectionStatus = "empty" | "unaccepted-warnings" | "accepted-warnings" | "errors";
export type PollingStationSummary = {
  countsAddUp: boolean;
  hasBlocks: boolean;
  hasWarnings: boolean;
  hasErrors: boolean;
  notableFormSections: {
    status: PollingStationFormSectionStatus;
    title?: string;
    formSection: FormSection;
  }[];
};

export function getPollingStationSummary(formState: FormState, values: PollingStationValues): PollingStationSummary {
  const result: PollingStationSummary = {
    countsAddUp: true,
    hasBlocks: false,
    hasWarnings: false,
    hasErrors: false,
    notableFormSections: [],
  };

  Object.values(formState.sections)
    .filter((section) => section.id !== "save")
    .sort(sortFormSections)
    .forEach((section) => {
      if (section.errors.length > 0) {
        result.notableFormSections.push({ status: "errors", formSection: section });
        result.countsAddUp = false;
        result.hasBlocks = true;
        result.hasErrors = true;
      } else if (section.warnings.length > 0) {
        result.hasWarnings = true;
        if (section.ignoreWarnings) {
          result.notableFormSections.push({ status: "accepted-warnings", formSection: section });
        } else {
          result.notableFormSections.push({ status: "unaccepted-warnings", formSection: section });
          result.hasBlocks = true;
        }
      } else if (section.id.startsWith("political_group_votes_") && isFormSectionEmpty(section, values)) {
        result.notableFormSections.push({
          status: "empty",
          formSection: section,
          title: `Lijst ${section.id.substring(22)}`,
        });
      }
    });

  return result;
}

function sortFormSections(a: FormSection, b: FormSection): number {
  if (a.index < b.index) return -1;
  if (a.index > b.index) return 1;
  return 0;
}

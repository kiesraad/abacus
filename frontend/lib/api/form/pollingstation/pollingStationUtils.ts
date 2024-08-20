import { ErrorsAndWarnings, FieldValidationResult } from "lib/api/api";

import { deepEqual, fieldNameFromPath, FieldSection, rootFieldSection } from "@kiesraad/util";

import { ValidationResult } from "../../gen/openapi";
import {
  AnyFormReference,
  ClientValidationResult,
  FormSection,
  FormSectionID,
  FormState,
  PollingStationValues,
} from "./PollingStationFormController";
import { DifferencesValues } from "./useDifferences.ts";
import { RecountedValue } from "./useRecounted.ts";
import { VotersAndVotesValues } from "./useVotersAndVotes";

export function addValidationResultToFormState(
  formState: FormState,
  arr: ValidationResult[],
  target: "errors" | "warnings",
) {
  arr.forEach((validationResult) => {
    const uniqueRootSections = uniqueFieldSections(validationResult.fields);

    uniqueRootSections.forEach((fieldSection) => {
      const { name: rootSection, index } = fieldSection;
      switch (rootSection) {
        case "votes_counts":
        case "voters_counts":
        case "voters_recounts":
          //dont add errors and warnings to the form state if the section is not saved
          if (formState.sections.voters_votes_counts.isSaved) {
            formState.sections.voters_votes_counts[target].push(validationResult);
          }
          break;
        case "differences_counts":
          //dont add errors and warnings to the form state if the section is not saved
          if (formState.sections.differences_counts.isSaved) {
            formState.sections.differences_counts[target].push(validationResult);
          }
          break;
        case "political_group_votes":
          if (index !== undefined) {
            const sectionKey = `political_group_votes_${index + 1}` as FormSectionID;
            const section = formState.sections[sectionKey];
            if (section) {
              //dont add errors and warnings to the form state if the section is not saved
              if (section.isSaved) {
                section[target].push(validationResult);
              }
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
    if (
      result.findIndex((s) => s.name === rootSection.name && s.index === rootSection.index) === -1
    ) {
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
export function getNextSection(
  formState: FormState,
  currentSection: FormSection,
): FormSectionID | null {
  for (const section of Object.values(formState.sections)) {
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

export function currentFormHasChanges(
  currentForm: AnyFormReference,
  values: PollingStationValues,
): boolean {
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

//transform a formsection's errors and warnings into a map of field id's and their errors and warnings
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

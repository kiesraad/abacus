import { deepEqual, rootFieldSection } from "@kiesraad/util";

import { ValidationResult } from "../../gen/openapi";
import {
  AnyFormReference,
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
    const { name: rootSection, index } = rootFieldSection(validationResult.fields[0]);
    switch (rootSection) {
      case "votes_counts":
      case "voters_counts":
      case "voters_recounts":
        formState.sections.voters_votes_counts[target].push(validationResult);
        break;
      case "differences_counts":
        formState.sections.differences_counts[target].push(validationResult);
        break;
      case "political_group_votes":
        if (index !== undefined) {
          const sectionKey = `political_group_votes_${index}` as FormSectionID;
          const section = formState.sections[sectionKey];
          if (section) {
            section[target].push(validationResult);
          }
        }
        break;
      default:
        formState.unknown[target].push(validationResult);
        break;
    }
  });
}

export function formSectionComplete(section: FormSection): boolean {
  if (section.isSaved) {
    if (section.errors.length === 0) {
      if (section.warnings.length === 0 || section.ignoreWarnings) {
        return true;
      }
    }
  }
  return false;
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
    console.log("A", valA);
    console.log("B", valB);
    return !deepEqual(valA, valB);
  }

  if (currentForm.type === "differences") {
    const valA: DifferencesValues = {
      differences_counts: values.differences_counts,
    };
    const valB = currentForm.getValues();
    return !deepEqual(valA, valB);
  }

  //political_group_votes
  const valA = values.political_group_votes.find((pg) => pg.number === currentForm.number);
  if (valA) {
    const valB = currentForm.getValues();
    return !deepEqual(valA, valB);
  }

  return false;
}

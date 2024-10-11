import { ErrorsAndWarnings } from "lib/api/api";

import { Election, PollingStationResults, ValidationResult, ValidationResults } from "@kiesraad/api";
import { ValidationResultType } from "@kiesraad/ui";
import { deepEqual, fieldNameFromPath, FieldSection, objectHasOnlyEmptyValues, rootFieldSection } from "@kiesraad/util";

import {
  AnyFormReference,
  ClientState,
  ClientValidationResult,
  FormSection,
  FormSectionID,
  FormState,
  INITIAL_FORM_SECTION_ID,
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
        case "recounted":
          checkAndAddValidationResult(formState.sections.recounted, target, validationResult);
          break;
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
          console.error("Unknown validation result target", target);
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
  return (
    section.isSaved &&
    (section.errors.length === 0 || hasOnlyGlobalValidationResults(section.errors)) &&
    (section.warnings.length === 0 || section.acceptWarnings)
  );
}

export function hasOnlyGlobalValidationResults(arr: ClientValidationResult[]): boolean {
  return arr.every((result) => isGlobalValidationResult(result));
}

export function resetFormSectionState(formState: FormState) {
  Object.values(formState.sections).forEach((section) => {
    // the server response contains the validation results for the entire form, so we can clear the old validation results
    section.errors = [];
    section.warnings = [];
    section.isSubmitted = undefined;
  });
}

export function getNextSectionID(formState: FormState) {
  const currentSection = formState.sections[formState.current];
  if (currentSection && currentSection.isSubmitted && formSectionComplete(currentSection)) {
    for (const section of Object.values(formState.sections)) {
      if ((formState.furthest === "save" && section.errors.length > 0) || section.index === currentSection.index + 1) {
        return section.id;
      }
    }
  }
  return null;
}

export function currentFormHasChanges(currentForm: AnyFormReference, values: PollingStationResults): boolean {
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

  return result;
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

export function getPollingStationSummary(formState: FormState, values: PollingStationResults): PollingStationSummary {
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
        if (section.acceptWarnings) {
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

export function getInitialValues(
  election: Required<Election>,
  defaultValues?: Partial<PollingStationResults>,
): PollingStationResults {
  return {
    recounted: undefined,
    voters_counts: {
      poll_card_count: 0,
      proxy_certificate_count: 0,
      voter_card_count: 0,
      total_admitted_voters_count: 0,
    },
    votes_counts: {
      votes_candidates_count: 0,
      blank_votes_count: 0,
      invalid_votes_count: 0,
      total_votes_cast_count: 0,
    },
    voters_recounts: undefined,
    differences_counts: {
      more_ballots_count: 0,
      fewer_ballots_count: 0,
      unreturned_ballots_count: 0,
      too_few_ballots_handed_out_count: 0,
      too_many_ballots_handed_out_count: 0,
      other_explanation_count: 0,
      no_explanation_count: 0,
    },
    political_group_votes: election.political_groups.map((pg) => ({
      number: pg.number,
      total: 0,
      candidate_votes: pg.candidates.map((c) => ({
        number: c.number,
        votes: 0,
      })),
    })),
    ...defaultValues,
  };
}

export function getInitialFormState(election: Required<Election>, defaultFormState?: Partial<FormState>): FormState {
  const result: FormState = {
    current: INITIAL_FORM_SECTION_ID,
    furthest: INITIAL_FORM_SECTION_ID,
    sections: {
      recounted: {
        index: 0,
        id: "recounted",
        title: "Is er herteld?",
        isSaved: false,
        acceptWarnings: false,
        errors: [],
        warnings: [],
      },
      voters_votes_counts: {
        index: 1,
        id: "voters_votes_counts",
        title: "Toegelaten kiezers en uitgebrachte stemmen",
        isSaved: false,
        acceptWarnings: false,
        errors: [],
        warnings: [],
      },
      differences_counts: {
        index: 2,
        id: "differences_counts",
        title: "Verschillen",
        isSaved: false,
        acceptWarnings: false,
        errors: [],
        warnings: [],
      },
      save: {
        index: election.political_groups.length + 3,
        id: "save",
        title: "Controleren en opslaan",
        isSaved: false,
        acceptWarnings: false,
        errors: [],
        warnings: [],
      },
    },
  };

  election.political_groups.forEach((pg, n) => {
    result.sections[`political_group_votes_${pg.number}`] = {
      index: n + 3,
      id: `political_group_votes_${pg.number}`,
      title: pg.name,
      isSaved: false,
      acceptWarnings: false,
      errors: [],
      warnings: [],
    };
  });

  return structuredClone({ ...result, ...defaultFormState });
}

export function getClientState(formState: FormState, acceptWarnings: boolean, continueToNextSection: boolean) {
  const clientState: ClientState = {
    furthest: formState.furthest,
    current: formState.current,
    acceptedWarnings: Object.values(formState.sections)
      .filter((s: FormSection) => s.acceptWarnings)
      .filter((s: FormSection) => s.id !== formState.current)
      .map((s: FormSection) => s.id),
    continue: continueToNextSection,
  };
  // the form state is not updated for the current submission,
  // so add the current section to the accepted warnings if needed
  if (acceptWarnings) {
    clientState.acceptedWarnings.push(formState.current);
  }
  return clientState;
}

export function buildFormState(
  clientState: ClientState,
  validationResults: ValidationResults,
  election: Required<Election>,
) {
  const newFormState = getInitialFormState(election);

  // set the furthest and current section
  newFormState.furthest = clientState.furthest;
  newFormState.current = clientState.current;

  // set accepted warnings
  clientState.acceptedWarnings.forEach((sectionID: FormSectionID) => {
    const section = newFormState.sections[sectionID];
    if (section) {
      section.acceptWarnings = true;
    }
  });

  // set saved sections to all sections before the furthest section
  const currentIndex = newFormState.sections[newFormState.furthest]?.index ?? 0;
  for (const section of Object.values(newFormState.sections)) {
    if (section.index < currentIndex) {
      section.isSaved = true;
    }
  }

  // set accepted warnings for the current section
  const acceptWarnings = clientState.acceptedWarnings.some(
    (sectionID: FormSectionID) => sectionID === newFormState.current,
  );

  updateFormStateAfterSubmit(newFormState, validationResults, acceptWarnings, clientState.continue);

  let targetFormSectionID: FormSectionID;
  if (clientState.continue) {
    targetFormSectionID = getNextSectionID(newFormState) ?? newFormState.current;
  } else {
    targetFormSectionID = newFormState.current;
  }

  return { formState: newFormState, targetFormSectionID };
}

export function updateFormStateAfterSubmit(
  formState: FormState,
  validationResults: ValidationResults,
  acceptWarnings: boolean,
  continueToNextSection: boolean = false,
) {
  resetFormSectionState(formState);

  const currentFormSection = formState.sections[formState.current];
  if (currentFormSection) {
    const saved = formState.furthest !== formState.current || continueToNextSection;
    //store that this section has been sent to the server
    currentFormSection.isSaved = saved;
    //store that this section has been submitted, this resets on each request
    currentFormSection.isSubmitted = saved;
    //flag ignore warnings
    currentFormSection.acceptWarnings = acceptWarnings;
  }

  //distribute errors and warnings to sections
  addValidationResultToFormState(formState, validationResults.errors, "errors");
  addValidationResultToFormState(formState, validationResults.warnings, "warnings");

  //determine the new furthest section, if applicable
  if (continueToNextSection && currentFormSection && formState.furthest === currentFormSection.id) {
    formState.furthest = getNextSectionID(formState) ?? formState.furthest;
  }

  if (formState.furthest !== "save") {
    //if the entire form is not completed yet, filter out global validation results since they don't have meaning yet.
    Object.values(formState.sections).forEach((section) => {
      section.errors = section.errors.filter((err) => !isGlobalValidationResult(err));
      section.warnings = section.warnings.filter((err) => !isGlobalValidationResult(err));
    });
  }

  // Reset acceptWarnings when a page gets an error or has no warnings anymore
  Object.values(formState.sections).forEach((section) => {
    if (section.acceptWarnings && (section.errors.length > 0 || section.warnings.length === 0)) {
      section.acceptWarnings = false;
    }
  });
}

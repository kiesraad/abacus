import { Election, PollingStationResults, ValidationResults } from "@kiesraad/api";
import { objectHasOnlyEmptyValues } from "@kiesraad/util";

import { INITIAL_FORM_SECTION_ID } from "./reducer";
import { ClientState, FormSection, FormSectionId, FormState } from "./types";
import { addValidationResultsToFormState, ValidationResultSet } from "./ValidationResults";

export function formSectionComplete(section: FormSection): boolean {
  return (
    section.isSaved &&
    (section.errors.isEmpty() || section.errors.hasOnlyGlobalValidationResults()) &&
    (section.warnings.isEmpty() || section.acceptWarnings)
  );
}

export function resetFormSectionState(formState: FormState) {
  Object.values(formState.sections).forEach((section) => {
    // the server response contains the validation results for the entire form, so we can clear the old validation results
    section.errors = new ValidationResultSet();
    section.warnings = new ValidationResultSet();
    section.isSubmitted = undefined;
    section.acceptWarningsError = false;
  });
}

export function getNextSectionID(formState: FormState) {
  const currentSection = formState.sections[formState.current];

  if (currentSection && currentSection.isSubmitted && formSectionComplete(currentSection)) {
    for (const section of Object.values(formState.sections)) {
      if ((formState.furthest === "save" && !section.errors.isEmpty()) || section.index === currentSection.index + 1) {
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
    title?: string;
    formSection: FormSection;
  }[];
};

export function getDataEntrySummary(formState: FormState): DataEntrySummary {
  const result: DataEntrySummary = {
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
      if (!section.errors.isEmpty()) {
        result.notableFormSections.push({ status: "errors", formSection: section });
        result.countsAddUp = false;
        result.hasBlocks = true;
        result.hasErrors = true;
      } else if (!section.warnings.isEmpty()) {
        result.hasWarnings = true;
        if (section.acceptWarnings) {
          result.notableFormSections.push({ status: "accepted-warnings", formSection: section });
        } else {
          result.notableFormSections.push({ status: "unaccepted-warnings", formSection: section });
          result.hasBlocks = true;
        }
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

export function getInitialFormState(election: Required<Election>): FormState {
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
        hasChanges: false,
        acceptWarningsError: false,
        errors: new ValidationResultSet(),
        warnings: new ValidationResultSet(),
      },
      voters_votes_counts: {
        index: 1,
        id: "voters_votes_counts",
        title: "Toegelaten kiezers en uitgebrachte stemmen",
        isSaved: false,
        acceptWarnings: false,
        hasChanges: false,
        acceptWarningsError: false,
        errors: new ValidationResultSet(),
        warnings: new ValidationResultSet(),
      },
      differences_counts: {
        index: 2,
        id: "differences_counts",
        title: "Verschillen",
        isSaved: false,
        acceptWarnings: false,
        hasChanges: false,
        acceptWarningsError: false,
        errors: new ValidationResultSet(),
        warnings: new ValidationResultSet(),
      },
      save: {
        index: election.political_groups.length + 3,
        id: "save",
        title: "Controleren en opslaan",
        isSaved: false,
        acceptWarnings: false,
        hasChanges: false,
        acceptWarningsError: false,
        errors: new ValidationResultSet(),
        warnings: new ValidationResultSet(),
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
      hasChanges: false,
      acceptWarningsError: false,
      errors: new ValidationResultSet(),
      warnings: new ValidationResultSet(),
    };
  });

  return result;
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
  election: Required<Election>,
) {
  const newFormState = getInitialFormState(election);

  // set the furthest and current section
  newFormState.furthest = clientState.furthest;
  newFormState.current = clientState.current;

  // set accepted warnings
  clientState.acceptedWarnings.forEach((sectionID: FormSectionId) => {
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
    (sectionID: FormSectionId) => sectionID === newFormState.current,
  );

  updateFormStateAfterSubmit(newFormState, validationResults, acceptWarnings);

  let targetFormSectionId: FormSectionId;
  if (clientState.continue) {
    targetFormSectionId = getNextSectionID(newFormState) ?? newFormState.current;
  } else {
    targetFormSectionId = newFormState.current;
  }

  return { formState: newFormState, targetFormSectionId };
}

export function updateFormStateAfterSubmit(
  formState: FormState,
  validationResults: ValidationResults,
  continueToNextSection: boolean = false,
): FormState {
  resetFormSectionState(formState);

  const currentFormSection = formState.sections[formState.current];
  if (currentFormSection) {
    const saved = formState.furthest !== formState.current || continueToNextSection;
    //store that this section has been sent to the server
    currentFormSection.isSaved = saved;
    //store that this section has been submitted, this resets on each request
    currentFormSection.isSubmitted = saved;
    // There are no changes after a successful submit
    currentFormSection.hasChanges = false;
  }

  //distribute errors and warnings to sections
  addValidationResultsToFormState(validationResults.errors, formState, "errors");
  addValidationResultsToFormState(validationResults.warnings, formState, "warnings");

  //determine the new furthest section, if applicable
  if (continueToNextSection && currentFormSection && formState.furthest === currentFormSection.id) {
    formState.furthest = getNextSectionID(formState) ?? formState.furthest;
  }

  if (formState.furthest !== "save") {
    //if the entire form is not completed yet, filter out global validation results since they don't have meaning yet.
    Object.values(formState.sections).forEach((section) => {
      section.errors.removeGlobalValidationResults();
      section.warnings.removeGlobalValidationResults();
    });
  }

  // Reset acceptWarnings when a page gets an error or has no warnings anymore
  Object.values(formState.sections).forEach((section) => {
    if (section.acceptWarnings && (!section.errors.isEmpty() || section.warnings.isEmpty())) {
      section.acceptWarnings = false;
    }
  });

  return formState;
}

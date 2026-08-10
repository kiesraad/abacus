import { describe, expect, test } from "vitest";

import { electionMockData } from "@/testing/api-mocks/ElectionMockData";
import { validationResultMockData } from "@/testing/api-mocks/ValidationResultMockData";
import type { ValidationResult, ValidationResultCode } from "@/types/generated/openapi";
import type { DataEntryResults, DataEntrySection } from "@/types/types";
import { getDataEntryStructure } from "@/utils/dataEntryStructure";
import { ValidationResultSet } from "@/utils/ValidationResults";

import {
  getDefaultDataEntryState,
  getDefaultDataEntryStructure,
  getDefaultFormSection,
  getDSOInitialValues,
  getInitialValues,
} from "../testing/mock-data";
import type { FormState } from "../types/types";
import {
  addCorrectionWarnings,
  addValidationResultsToFormState,
  calculateDataEntryProgress,
  formSectionComplete,
  getNextSectionID,
  isFormSectionEmpty,
  isSectionDisabled,
  resetDisabledSectionValues,
  resetFieldValues,
  resetFormSectionState,
  updateDisabledSections,
} from "./dataEntryUtils";

describe("formSectionComplete", () => {
  test("formSectionComplete", () => {
    expect(
      formSectionComplete({
        index: 0,
        id: "voters_votes_counts",
        isDisabled: false,
        isSaved: false,
        acceptErrorsAndWarnings: false,
        errors: new ValidationResultSet(),
        warnings: new ValidationResultSet(),
        hasChanges: false,
        acceptErrorsAndWarningsError: false,
      }),
    ).toBe(false);

    expect(
      formSectionComplete({
        index: 0,
        id: "voters_votes_counts",
        isDisabled: false,
        isSaved: true,
        acceptErrorsAndWarnings: false,
        errors: new ValidationResultSet(),
        warnings: new ValidationResultSet(),
        hasChanges: false,
        acceptErrorsAndWarningsError: false,
      }),
    ).toBe(true);
  });
});

describe("resetFormSectionState", () => {
  test("should reset form section state", () => {
    const formState = getDefaultDataEntryState().formState;
    formState.sections.voters_votes_counts!.errors = new ValidationResultSet([validationResultMockData.W201]);

    resetFormSectionState(formState);

    expect(formState.sections.voters_votes_counts!.errors.size()).toBe(0);
  });
});

describe("getNextSectionID", () => {
  test("should get next section ID", () => {
    const formState = getDefaultDataEntryState().formState;
    formState.sections.voters_votes_counts!.isSaved = true;
    formState.sections.voters_votes_counts!.isSubmitted = true;

    const nextSection = getNextSectionID(formState, "voters_votes_counts");

    expect(nextSection).toBe("differences_counts");
  });

  test("should skip disabled sections", () => {
    const formState = getDefaultDataEntryState().formState;
    formState.sections.voters_votes_counts!.isSaved = true;
    formState.sections.voters_votes_counts!.isSubmitted = true;
    formState.sections.differences_counts!.isDisabled = true;

    const nextSection = getNextSectionID(formState, "voters_votes_counts");

    expect(nextSection).toBe("political_group_votes_1");
  });
});

describe("isSectionDisabled", () => {
  const section: DataEntrySection = {
    id: "checks_and_corrections",
    title: "Checks and corrections",
    short_title: "Checks and corrections",
    disabled_when: {
      path: "about_report.checks_and_corrections_present",
      equal_to: "PageMissing",
    },
    subsections: [],
  };

  test("section without disabled_when is never disabled", () => {
    const sectionWithoutDisabledWhen: DataEntrySection = {
      ...section,
      disabled_when: undefined,
    };

    expect(
      isSectionDisabled(sectionWithoutDisabledWhen, {
        about_report: { checks_and_corrections_present: "PageMissing" },
      }),
    ).toBe(false);
  });

  test("section is disabled when value at path matches", () => {
    expect(
      isSectionDisabled(section, {
        about_report: { checks_and_corrections_present: "PageMissing" },
      }),
    ).toBe(true);
  });

  test("section is not disabled when value at path does not match", () => {
    expect(
      isSectionDisabled(section, {
        about_report: { checks_and_corrections_present: "PagePresent" },
      }),
    ).toBe(false);
    expect(
      isSectionDisabled(section, {
        about_report: { checks_and_corrections_present: "" },
      }),
    ).toBe(false);
  });
});

describe("updateDisabledSections", () => {
  const disabledWhenSection: DataEntrySection = {
    id: "differences_counts",
    title: "Differences",
    short_title: "Differences",
    disabled_when: {
      path: "about_report.checks_and_corrections_present",
      equal_to: "PageMissing",
    },
    subsections: [],
  };

  test("disables sections when disabled_when matches and re-enables them when it no longer does", () => {
    const state = getDefaultDataEntryState();
    const dataEntryStructure = state.dataEntryStructure.map((section) =>
      section.id === "differences_counts" ? disabledWhenSection : section,
    );

    updateDisabledSections(state.formState, dataEntryStructure, {
      about_report: { checks_and_corrections_present: "PageMissing" },
    });
    expect(state.formState.sections.differences_counts!.isDisabled).toBe(true);
    expect(state.formState.sections.voters_votes_counts!.isDisabled).toBe(false);

    updateDisabledSections(state.formState, dataEntryStructure, {
      about_report: { checks_and_corrections_present: "PagePresent" },
    });
    expect(state.formState.sections.differences_counts!.isDisabled).toBe(false);
  });

  test("updates furthest to the next enabled section when the furthest section is skipped", () => {
    const state = getDefaultDataEntryState();
    const dataEntryStructure = state.dataEntryStructure.map((section) =>
      section.id === "differences_counts" ? disabledWhenSection : section,
    );
    state.formState.furthest = "differences_counts";

    updateDisabledSections(state.formState, dataEntryStructure, {
      about_report: { checks_and_corrections_present: "PageMissing" },
    });

    expect(state.formState.furthest).toBe("political_group_votes_1");
  });
});

describe("resetSkippedSectionValues", () => {
  const dataEntryStructure = getDataEntryStructure("DSOFirstSession", electionMockData);

  test("resets the values of a skipped section", () => {
    const results = getDSOInitialValues();
    results.about_report.checks_and_corrections_present = "PageMissing";
    results.checks_and_corrections.reason_investigation_own_initiative.unaccounted_difference = true;
    results.checks_and_corrections.corrected_results_own_initiative.yes = true;
    results.checks_and_corrections.corrected_results_csb_request.no = true;
    results.voters_counts.poll_card_count = 10;

    resetDisabledSectionValues(dataEntryStructure, results);

    expect(results.checks_and_corrections.reason_investigation_own_initiative.unaccounted_difference).toBe(false);
    expect(results.checks_and_corrections.corrected_results_own_initiative.yes).toBe(false);
    expect(results.checks_and_corrections.corrected_results_csb_request.no).toBe(false);
    // other sections are untouched
    expect(results.about_report.checks_and_corrections_present).toBe("PageMissing");
    expect(results.voters_counts.poll_card_count).toBe(10);
  });

  test("does not reset values when the section is not skipped", () => {
    const results = getDSOInitialValues();
    results.about_report.checks_and_corrections_present = "PagePresent";
    results.checks_and_corrections.corrected_results_own_initiative.yes = true;

    resetDisabledSectionValues(dataEntryStructure, results);

    expect(results.checks_and_corrections.corrected_results_own_initiative.yes).toBe(true);
  });
});

describe("isFormSectionEmpty", () => {
  const dataEntryStructure = getDefaultDataEntryStructure();

  test("political group form is empty", () => {
    const section = getDefaultFormSection("political_group_votes_1", 0);
    const values = getInitialValues();

    expect(isFormSectionEmpty(dataEntryStructure, section, values)).toBeTruthy();
  });

  test("political group form: total is not empty", () => {
    const section = getDefaultFormSection("political_group_votes_1", 0);
    const values = getInitialValues();
    values.political_group_votes[0]!.total = 100;

    expect(isFormSectionEmpty(dataEntryStructure, section, values)).toBeFalsy();
  });

  test("political group form: candidate votes is not empty", () => {
    const section = getDefaultFormSection("political_group_votes_1", 0);
    const values = getInitialValues();
    values.political_group_votes[0]!.candidate_votes[0]!.votes = 100;

    expect(isFormSectionEmpty(dataEntryStructure, section, values)).toBeFalsy();
  });

  test("voters and votes form is empty", () => {
    const section = getDefaultFormSection("voters_votes_counts", 0);
    const values = getInitialValues();

    expect(isFormSectionEmpty(dataEntryStructure, section, values)).toBeTruthy();
  });

  test("voters and votes form: votes is not empty", () => {
    const section = getDefaultFormSection("voters_votes_counts", 0);
    const values = getInitialValues();
    values.votes_counts.invalid_votes_count = 3;

    expect(isFormSectionEmpty(dataEntryStructure, section, values)).toBeFalsy();
  });

  test("voters and votes form: voters is not empty", () => {
    const section = getDefaultFormSection("voters_votes_counts", 0);
    const values = getInitialValues();
    values.voters_counts.total_admitted_voters_count = 6;

    expect(isFormSectionEmpty(dataEntryStructure, section, values)).toBeFalsy();
  });

  test("differences form is empty", () => {
    const section = getDefaultFormSection("differences_counts", 0);
    const values = getInitialValues();

    expect(isFormSectionEmpty(dataEntryStructure, section, values)).toBeTruthy();
  });

  test("differences form is not empty", () => {
    const section = getDefaultFormSection("differences_counts", 0);
    const values = getInitialValues();
    values.differences_counts.more_ballots_count = 5;

    expect(isFormSectionEmpty(dataEntryStructure, section, values)).toBeFalsy();
  });

  test("section not in data entry structure is considered empty", () => {
    const section = getDefaultFormSection("unknown_section", 0);
    const values = getInitialValues();

    expect(isFormSectionEmpty(dataEntryStructure, section, values)).toBeTruthy();
  });

  test("boolean fields with value false are considered empty", () => {
    const booleanSection: DataEntrySection = {
      id: "boolean_test",
      title: "Boolean Test Section",
      short_title: "Boolean Test",
      subsections: [
        {
          type: "checkboxes",
          short_title: "Checkbox Test",
          error_path: "test.checkbox_error",
          error_message: "Checkbox error",
          options: [
            {
              path: "test.checkbox_field",
              label: "Checkbox",
              short_label: "Checkbox",
            },
          ],
        },
      ],
    };

    const section = getDefaultFormSection("boolean_test", 0);

    // Test with false values - should be considered empty
    const valuesWithFalse = {
      ...getInitialValues(),
      test: {
        checkbox_field: false,
      },
    };

    expect(isFormSectionEmpty([booleanSection], section, valuesWithFalse)).toBeTruthy();

    // Test with a true value - should be considered non-empty
    const valuesWithTrue = {
      ...getInitialValues(),
      test: {
        checkbox_field: true,
      },
    };

    expect(isFormSectionEmpty([booleanSection], section, valuesWithTrue)).toBeFalsy();
  });

  test("radio fields with empty value are considered null", () => {
    const radioSection: DataEntrySection = {
      id: "radio_test",
      title: "Radio Test Section",
      short_title: "Radio Test",
      subsections: [
        {
          type: "radio",
          short_title: "Radio Test",
          error: "Radio error",
          path: "test.radio_field",
          options: [{ label: "Radio", short_label: "Radio", value: "OptionA" }],
        },
      ],
    };

    const section = getDefaultFormSection("radio_test", 0);

    // Test with empty values - should be considered null
    const data = {
      ...getInitialValues(),
      test: {
        radio_field: "",
      },
    };

    expect(isFormSectionEmpty([radioSection], section, data)).toBeTruthy();

    // Test with a non-empty value - should be considered non-empty
    const valuesWithTrue = {
      ...getInitialValues(),
      test: {
        radio_field: "OptionA",
      },
    };

    expect(isFormSectionEmpty([radioSection], section, valuesWithTrue)).toBeFalsy();
  });
});

describe("calculateDataEntryProgress", () => {
  test("data entry progress is rounded down", () => {
    const formState: FormState = {
      furthest: "voters_votes_counts",
      sections: {
        voters_votes_counts: getDefaultFormSection("voters_votes_counts", 0),
        differences_counts: getDefaultFormSection("differences_counts", 1),
        political_group_votes_1: getDefaultFormSection("political_group_votes_1", 2),
        political_group_votes_2: getDefaultFormSection("political_group_votes_2", 3),
        political_group_votes_3: getDefaultFormSection("political_group_votes_3", 4),
        save: getDefaultFormSection("save", 5),
      },
    };
    const progress = calculateDataEntryProgress(formState);
    expect(progress).toBe(16);
  });
});

describe("addValidationResultToFormState", () => {
  test("should add validation result to form state", () => {
    const defaultState = getDefaultDataEntryState();
    const formState = defaultState.formState;
    const dataEntryStructure = defaultState.dataEntryStructure;
    formState.sections.differences_counts!.isSaved = true;
    const validationResults: ValidationResult[] = [validationResultMockData.F303];

    addValidationResultsToFormState(validationResults, formState, dataEntryStructure, "errors");

    expect(formState.sections.differences_counts!.errors.size()).toBe(1);
  });

  test("addValidationResultToFormState adds result to multiple sections", () => {
    const defaultState = getDefaultDataEntryState();
    const formState = defaultState.formState;
    const dataEntryStructure = defaultState.dataEntryStructure;

    formState.sections.voters_votes_counts!.isSaved = true;
    if (formState.sections.political_group_votes_1) formState.sections.political_group_votes_1.isSaved = true;

    const validationResults: ValidationResult[] = [
      {
        fields: ["data.votes_counts.total_votes_candidates_count", "data.political_group_votes.0.total"],
        code: "F000" as ValidationResultCode,
      },
    ];

    addValidationResultsToFormState(validationResults, formState, dataEntryStructure, "errors");

    expect(formState.sections.voters_votes_counts!.errors.size()).toBe(1);
    const pg1 = formState.sections.political_group_votes_1;
    expect(pg1?.errors.size()).toBe(1);
  });

  test("addValidationResultToFormState doesnt add errors to unsaved sections", () => {
    const defaultState = getDefaultDataEntryState();
    const formState = defaultState.formState;
    const dataEntryStructure = defaultState.dataEntryStructure;
    formState.sections.differences_counts!.isSaved = false;
    const validationResults: ValidationResult[] = [validationResultMockData.F303];

    addValidationResultsToFormState(validationResults, formState, dataEntryStructure, "errors");

    expect(formState.sections.differences_counts!.errors.size()).toBe(0);
  });
});

describe("correction warnings", () => {
  test("addCorrectionWarnings", () => {
    const defaultState = getDefaultDataEntryState();
    const formState = defaultState.formState;
    const structure = defaultState.dataEntryStructure;

    const correctionWarnings = [
      "data.voters_counts.poll_card_count",
      "data.voters_counts.proxy_certificate_count",
      "data.political_group_votes.0.candidate_votes.0.votes",
    ];

    addCorrectionWarnings(structure, correctionWarnings, formState);

    expect(formState.sections.voters_votes_counts!.correctionWarning).toStrictEqual({
      code: "W002",
      fields: ["data.voters_counts.poll_card_count", "data.voters_counts.proxy_certificate_count"],
    });
    expect(formState.sections.differences_counts!.correctionWarning).toBeUndefined();
    expect(formState.sections.political_group_votes_1!.correctionWarning).toStrictEqual({
      code: "W002",
      fields: ["data.political_group_votes.0.candidate_votes.0.votes"],
    });
  });

  test("resetFieldValues", () => {
    const defaultState = getDefaultDataEntryState();
    const structure = defaultState.dataEntryStructure;
    const data: DataEntryResults = {
      voters_counts: {
        poll_card_count: 99,
        proxy_certificate_count: 1,
        voter_card_count: 5,
        total_admitted_voters_count: 5,
      },
      differences_counts: {
        difference_completely_accounted_for: {
          yes: true,
          no: false,
        },
      },
      political_group_votes: [
        {
          candidate_votes: [{ votes: 100 }, { votes: 33 }, { votes: 2 }],
        },
      ],
    };

    const correctionWarnings = [
      "data.voters_counts.poll_card_count",
      "data.voters_counts.proxy_certificate_count",
      "data.differences_counts.difference_completely_accounted_for",
      "data.political_group_votes.0.candidate_votes.0.votes",
    ];

    resetFieldValues(structure, correctionWarnings, data);

    expect(data).toStrictEqual({
      voters_counts: {
        poll_card_count: 0,
        proxy_certificate_count: 0,
        voter_card_count: 5,
        total_admitted_voters_count: 5,
      },
      differences_counts: {
        difference_completely_accounted_for: {
          yes: false,
          no: false,
        },
      },
      political_group_votes: [
        {
          candidate_votes: [{ votes: 0 }, { votes: 33 }, { votes: 2 }],
        },
      ],
    });
  });
});

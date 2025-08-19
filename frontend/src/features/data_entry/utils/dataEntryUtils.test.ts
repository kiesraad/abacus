import { describe, expect, test } from "vitest";

import { validationResultMockData } from "@/testing/api-mocks/ValidationResultMockData";
import { ValidationResult } from "@/types/generated/openapi";
import { DataEntrySection } from "@/types/types";
import { ValidationResultSet } from "@/utils/ValidationResults";

import {
  getDefaultDataEntryState,
  getDefaultDataEntryStructure,
  getDefaultFormSection,
  getInitialValues,
} from "../testing/mock-data";
import {
  addValidationResultsToFormState,
  formSectionComplete,
  getNextSectionID,
  isFormSectionEmpty,
  resetFormSectionState,
} from "./dataEntryUtils";

describe("formSectionComplete", () => {
  test("formSectionComplete", () => {
    expect(
      formSectionComplete({
        index: 0,
        id: "voters_votes_counts",
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
          type: "radio",
          short_title: "Radio Test",
          error: "Radio error",
          path: "test.radio_field",
          options: [
            { value: "true", label: "Yes", short_label: "Yes" },
            { value: "false", label: "No", short_label: "No" },
          ],
        },
        {
          type: "checkboxes",
          short_title: "Checkbox Test",
          error_path: "test.checkbox_error",
          error_message: "Checkbox error",
          options: [{ path: "test.checkbox_field", label: "Checkbox", short_label: "Checkbox" }],
        },
      ],
    };

    const section = getDefaultFormSection("boolean_test", 0);

    // Test with false values - should be considered empty
    const valuesWithFalse = {
      ...getInitialValues(),
      test: {
        radio_field: false,
        checkbox_field: false,
      },
    };

    expect(isFormSectionEmpty([booleanSection], section, valuesWithFalse)).toBeTruthy();

    // Test with a true value - should be considered non-empty
    const valuesWithTrue = {
      ...getInitialValues(),
      test: {
        radio_field: true,
        checkbox_field: false,
      },
    };

    expect(isFormSectionEmpty([booleanSection], section, valuesWithTrue)).toBeFalsy();
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

    const validationResults: ValidationResult[] = [validationResultMockData.F202];

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

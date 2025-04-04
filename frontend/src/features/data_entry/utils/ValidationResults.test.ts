import { describe, expect, test } from "vitest";

import { ValidationResult } from "@/api";

import { errorWarningMocks, getDefaultDataEntryState } from "../testing/mock-data";
import {
  addValidationResultsToFormState,
  isGlobalValidationResult,
  mapFieldNameToFormSection,
  mapValidationResultsToFields,
  ValidationResultSet,
} from "./ValidationResults";

describe("ValidationResultSet", () => {
  test("includes", () => {
    const validationResults = new ValidationResultSet([errorWarningMocks.F201, errorWarningMocks.F202]);
    expect(validationResults.includes("F201")).toBe(true);
    expect(validationResults.includes("F204")).toBe(false);
  });

  test("hasOnlyGlobalValidationResults", () => {
    const onlyGlobalResults = new ValidationResultSet([errorWarningMocks.F204]);
    expect(onlyGlobalResults.hasOnlyGlobalValidationResults()).toBe(true);

    const onlyLocalResults = new ValidationResultSet([errorWarningMocks.W201, errorWarningMocks.W202]);
    expect(onlyLocalResults.hasOnlyGlobalValidationResults()).toBe(false);

    const mixedResults = new ValidationResultSet([errorWarningMocks.F204, errorWarningMocks.W201]);
    expect(mixedResults.hasOnlyGlobalValidationResults()).toBe(false);
  });
});

describe("isGlobalValidationResult", () => {
  test("should check if validation result is global", () => {
    expect(isGlobalValidationResult(errorWarningMocks.F204)).toBe(true);
    expect(isGlobalValidationResult(errorWarningMocks.F303)).toBe(false);
    expect(isGlobalValidationResult(errorWarningMocks.F301)).toBe(false);
  });
});

describe("mapFieldNameToFormSection", () => {
  test.each([
    ["data.recounted", "recounted"],
    ["data.voters_counts.poll_card_count", "voters_votes_counts"],
    ["data.votes_counts.blank_votes_count", "voters_votes_counts"],
    ["data.voters_recounts.poll_card_count", "voters_votes_counts"],
    ["data.political_group_votes[0].total", "political_group_votes_1"],
    ["data.political_group_votes[8].candidate_votes[1].votes", "political_group_votes_9"],
    ["data.political_group_votes[11].candidate_votes[1].votes", "political_group_votes_12"],
    ["data.political_group_votes[20].candidate_votes[5].votes", "political_group_votes_21"],
  ])("map field name %s to field section %s", (fieldName: string, formSection: string) => {
    expect(mapFieldNameToFormSection(fieldName)).equals(formSection);
  });

  test("should throw error for unknown field name", () => {
    expect(() => mapFieldNameToFormSection("data.unknown")).toThrowError();
  });
});

describe("addValidationResultToFormState", () => {
  test("should add validation result to form state", () => {
    const formState = getDefaultDataEntryState().formState;
    formState.sections.differences_counts.isSaved = true;
    const validationResults: ValidationResult[] = [errorWarningMocks.F303];

    addValidationResultsToFormState(validationResults, formState, "errors");

    expect(formState.sections.differences_counts.errors.size()).toBe(1);
  });

  test("addValidationResultToFormState adds result to multiple sections", () => {
    const formState = getDefaultDataEntryState().formState;

    formState.sections.voters_votes_counts.isSaved = true;
    if (formState.sections.political_group_votes_1) formState.sections.political_group_votes_1.isSaved = true;

    const validationResults: ValidationResult[] = [errorWarningMocks.F204];

    addValidationResultsToFormState(validationResults, formState, "errors");

    expect(formState.sections.voters_votes_counts.errors.size()).toBe(1);
    const pg1 = formState.sections.political_group_votes_1;
    expect(pg1?.errors.size()).toBe(1);
  });

  test("addValidationResultToFormState doesnt add errors to unsaved sections", () => {
    const formState = getDefaultDataEntryState().formState;
    formState.sections.differences_counts.isSaved = false;
    const validationResults: ValidationResult[] = [errorWarningMocks.F303];

    addValidationResultsToFormState(validationResults, formState, "errors");

    expect(formState.sections.differences_counts.errors.size()).toBe(0);
  });
});

describe("mapValidationResultsToFields", () => {
  test("mapValidationResultsToFields errors", () => {
    const errors = new ValidationResultSet([errorWarningMocks.F201, errorWarningMocks.F202]);
    const warnings = new ValidationResultSet([errorWarningMocks.W201]);

    const errorsAndWarnings = mapValidationResultsToFields(errors, warnings);
    expect(errorsAndWarnings.get("data.votes_counts.blank_votes_count")).toEqual("error");
  });

  test("getErrorsAndWarnings warnings", () => {
    const errors = new ValidationResultSet();
    const warnings = new ValidationResultSet([errorWarningMocks.W201]);

    const errorsAndWarnings = mapValidationResultsToFields(errors, warnings);
    expect(errorsAndWarnings.get("data.votes_counts.blank_votes_count")).equals("warning");
  });
});

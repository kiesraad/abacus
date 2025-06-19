import { describe, expect, test } from "vitest";

import { emptyData } from "@/testing/api-mocks/DataEntryMockData";
import { electionMockData } from "@/testing/api-mocks/ElectionMockData";
import { validationResultMockData } from "@/testing/api-mocks/ValidationResultMockData";
import { PollingStationResults } from "@/types/generated/openapi";

import { getDataEntryStructure } from "./dataEntryStructure";
import {
  isGlobalValidationResult,
  mapFieldNameToFormSection,
  mapValidationResultsToFields,
  ValidationResultSet,
} from "./ValidationResults";

describe("ValidationResultSet", () => {
  test("includes", () => {
    const validationResults = new ValidationResultSet([validationResultMockData.F201, validationResultMockData.F202]);
    expect(validationResults.includes("F201")).toBe(true);
    expect(validationResults.includes("F204")).toBe(false);
  });

  test("hasOnlyGlobalValidationResults", () => {
    const onlyGlobalResults = new ValidationResultSet([validationResultMockData.F204]);
    expect(onlyGlobalResults.hasOnlyGlobalValidationResults()).toBe(true);

    const onlyLocalResults = new ValidationResultSet([validationResultMockData.W201, validationResultMockData.W202]);
    expect(onlyLocalResults.hasOnlyGlobalValidationResults()).toBe(false);

    const mixedResults = new ValidationResultSet([validationResultMockData.F204, validationResultMockData.W201]);
    expect(mixedResults.hasOnlyGlobalValidationResults()).toBe(false);
  });
});

describe("isGlobalValidationResult", () => {
  test("should check if validation result is global", () => {
    expect(isGlobalValidationResult(validationResultMockData.F204)).toBe(true);
    expect(isGlobalValidationResult(validationResultMockData.F303)).toBe(false);
    expect(isGlobalValidationResult(validationResultMockData.F301)).toBe(false);
  });
});

describe("mapFieldNameToFormSection", () => {
  test.each([
    ["data.recounted", "recounted"],
    ["data.voters_counts.poll_card_count", "voters_votes_counts"],
    ["data.votes_counts.blank_votes_count", "voters_votes_counts"],
    ["data.voters_recounts.poll_card_count", "voters_votes_counts"],
    ["data.political_group_votes[0].total", "political_group_votes_1"],
    ["data.political_group_votes[0].candidate_votes[0].votes", "political_group_votes_1"],
    ["data.political_group_votes[0].candidate_votes[1].votes", "political_group_votes_1"],
    ["data.political_group_votes[1].total", "political_group_votes_2"],
    ["data.political_group_votes[1].candidate_votes[0].votes", "political_group_votes_2"],
    // Test parent object paths
    ["data.political_group_votes[0]", "political_group_votes_1"],
    ["data.political_group_votes[1]", "political_group_votes_2"],
    ["data.voters_counts", "voters_votes_counts"],
    ["data.votes_counts", "voters_votes_counts"],
  ])("map field name %s to field section %s", (fieldName: string, formSection: string) => {
    const results: PollingStationResults = {
      ...emptyData,
      recounted: true,
    };
    const dataEntryStructure = getDataEntryStructure(electionMockData, results);
    expect(mapFieldNameToFormSection(fieldName, dataEntryStructure)).equals(formSection);
  });

  test("should throw error for unknown field name", () => {
    const dataEntryStructure = getDataEntryStructure(electionMockData);
    expect(() => mapFieldNameToFormSection("data.unknown", dataEntryStructure)).toThrowError();
  });
});

describe("mapValidationResultsToFields", () => {
  test("mapValidationResultsToFields errors", () => {
    const errors = new ValidationResultSet([validationResultMockData.F201, validationResultMockData.F202]);
    const warnings = new ValidationResultSet([validationResultMockData.W201]);

    const errorsAndWarnings = mapValidationResultsToFields(errors, warnings);
    expect(errorsAndWarnings.get("data.votes_counts.blank_votes_count")).toEqual("error");
  });

  test("getErrorsAndWarnings warnings", () => {
    const errors = new ValidationResultSet();
    const warnings = new ValidationResultSet([validationResultMockData.W201]);

    const errorsAndWarnings = mapValidationResultsToFields(errors, warnings);
    expect(errorsAndWarnings.get("data.votes_counts.blank_votes_count")).equals("warning");
  });
});

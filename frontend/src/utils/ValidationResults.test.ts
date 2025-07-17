import { describe, expect, test } from "vitest";

import { electionMockData } from "@/testing/api-mocks/ElectionMockData";
import { validationResultMockData } from "@/testing/api-mocks/ValidationResultMockData";

import { getDataEntryStructure } from "./dataEntryStructure";
import {
  doesValidationResultApplyToSection,
  dottedCode,
  getValidationResultSetForSection,
  isGlobalValidationResult,
  mapValidationResultSetsToFields,
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

describe("mapValidationResultSetsToFields", () => {
  test("errors", () => {
    const errors = new ValidationResultSet([validationResultMockData.F201, validationResultMockData.F202]);
    const warnings = new ValidationResultSet([validationResultMockData.W201]);

    const errorsAndWarnings = mapValidationResultSetsToFields(errors, warnings);
    expect(errorsAndWarnings.get("data.votes_counts.blank_votes_count")).toEqual("error");
  });

  test("warnings", () => {
    const errors = new ValidationResultSet();
    const warnings = new ValidationResultSet([validationResultMockData.W201]);

    const errorsAndWarnings = mapValidationResultSetsToFields(errors, warnings);
    expect(errorsAndWarnings.get("data.votes_counts.blank_votes_count")).toEqual("warning");
  });
});

describe("doesValidationResultApplyToSection", () => {
  test("should return true when validation result applies to section", () => {
    const dataEntryStructure = getDataEntryStructure(electionMockData);

    const votersVotesSection = dataEntryStructure.find((s) => s.id === "voters_votes_counts")!;
    expect(doesValidationResultApplyToSection(validationResultMockData.F201, votersVotesSection)).toBe(true);
    expect(doesValidationResultApplyToSection(validationResultMockData.F202, votersVotesSection)).toBe(true);
    expect(doesValidationResultApplyToSection(validationResultMockData.F204, votersVotesSection)).toBe(true);
    expect(doesValidationResultApplyToSection(validationResultMockData.W203, votersVotesSection)).toBe(true);

    const politicalGroupSection1 = dataEntryStructure.find((s) => s.id === "political_group_votes_1")!;
    expect(doesValidationResultApplyToSection(validationResultMockData.F401, politicalGroupSection1)).toBe(true);
    expect(doesValidationResultApplyToSection(validationResultMockData.F204, politicalGroupSection1)).toBe(true);
  });

  test("should return false when validation result does not apply to section", () => {
    const dataEntryStructure = getDataEntryStructure(electionMockData);

    const differencesSection = dataEntryStructure.find((s) => s.id === "differences_counts")!;
    expect(doesValidationResultApplyToSection(validationResultMockData.F201, differencesSection)).toBe(false);
    expect(doesValidationResultApplyToSection(validationResultMockData.F202, differencesSection)).toBe(false);

    const politicalGroupSection1 = dataEntryStructure.find((s) => s.id === "political_group_votes_1")!;
    expect(doesValidationResultApplyToSection(validationResultMockData.F301, politicalGroupSection1)).toBe(false);

    const politicalGroupSection2 = dataEntryStructure.find((s) => s.id === "political_group_votes_2")!;
    expect(doesValidationResultApplyToSection(validationResultMockData.F401, politicalGroupSection2)).toBe(false);
    expect(doesValidationResultApplyToSection(validationResultMockData.F204, politicalGroupSection2)).toBe(false);
  });
});

// TODO: clean up these tests
describe("getValidationResultSetForSection", () => {
  test("should return validation results for specific section", () => {
    const dataEntryStructure = getDataEntryStructure(electionMockData);
    const votersVotesSection = dataEntryStructure.find((s) => s.id === "voters_votes_counts")!;

    const validationResults = [
      validationResultMockData.F201, // voters_counts
      validationResultMockData.F202, // votes_counts
      validationResultMockData.W203, // votes_counts and voters_counts
      validationResultMockData.F204, // votes_counts and political_group_votes
      validationResultMockData.F301, // differences_counts
      validationResultMockData.F401, // political_group_votes
    ];

    const resultSet = getValidationResultSetForSection(validationResults, votersVotesSection);

    expect(resultSet.size()).toBe(4);
    expect(resultSet.includes("F201")).toBe(true);
    expect(resultSet.includes("F202")).toBe(true);
    expect(resultSet.includes("W203")).toBe(true);
    expect(resultSet.includes("F204")).toBe(true);
    expect(resultSet.includes("F301")).toBe(false);
    expect(resultSet.includes("F401")).toBe(false);
  });

  test("should return empty set when no validation results match section", () => {
    const dataEntryStructure = getDataEntryStructure(electionMockData);
    const votersVotesSection = dataEntryStructure.find((s) => s.id === "voters_votes_counts")!;

    const validationResults = [
      validationResultMockData.F301, // differences_counts
      validationResultMockData.F401, // political_group_votes
    ];

    const resultSet = getValidationResultSetForSection(validationResults, votersVotesSection);

    expect(resultSet.isEmpty()).toBe(true);
  });

  test("should work with political group sections", () => {
    const dataEntryStructure = getDataEntryStructure(electionMockData);
    const politicalGroupSection = dataEntryStructure.find((s) => s.id === "political_group_votes_1")!;

    const validationResults = [
      validationResultMockData.F401, // political_group_votes[0]
      validationResultMockData.F204, // includes political_group_votes[0].total
      validationResultMockData.F301, // differences_counts
    ];

    const resultSet = getValidationResultSetForSection(validationResults, politicalGroupSection);

    expect(resultSet.size()).toBe(2);
    expect(resultSet.includes("F401")).toBe(true);
    expect(resultSet.includes("F204")).toBe(true);
    expect(resultSet.includes("F301")).toBe(false);
  });
});

describe("dottedCode", () => {
  test("should insert a dot in between validation result code letter and number", () => {
    expect(dottedCode("F301")).toBe("F.301");
    expect(dottedCode("W203")).toBe("W.203");
  });
});

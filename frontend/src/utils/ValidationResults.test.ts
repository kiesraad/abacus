import { describe, expect, test } from "vitest";

import { electionMockData } from "@/testing/api-mocks/ElectionMockData";
import { validationResultMockData } from "@/testing/api-mocks/ValidationResultMockData";
import { ValidationResult } from "@/types/generated/openapi";

import { getDataEntryStructure } from "./dataEntryStructure";
import {
  doesValidationResultApplyToSection,
  dottedCode,
  getValidationResultSetForSection,
  mapValidationResultSetsToFields,
  ValidationResultSet,
} from "./ValidationResults";

describe("ValidationResultSet", () => {
  test("includes", () => {
    const validationResults = new ValidationResultSet([validationResultMockData.F201, validationResultMockData.F203]);
    expect(validationResults.includes("F201")).toBe(true);
    expect(validationResults.includes("F202")).toBe(false);
  });
});

describe("mapValidationResultSetsToFields", () => {
  test("errors", () => {
    const errors = new ValidationResultSet([validationResultMockData.F201, validationResultMockData.F203]);
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
  const extraInvestigationW001: ValidationResult = {
    code: "W001",
    fields: [
      "data.extra_investigation.extra_investigation_other_reason.yes",
      "data.extra_investigation.ballots_recounted_extra_investigation.no",
    ],
  };

  const countingDifferencesPollingStationW001: ValidationResult = {
    code: "W001",
    fields: [
      "data.counting_differences_polling_station.unexplained_difference_ballots_voters.yes",
      "data.counting_differences_polling_station.difference_ballots_per_list.no",
    ],
  };

  test("should return true when validation result applies to section", () => {
    const dataEntryStructure = getDataEntryStructure(electionMockData);

    const extraInvestigationSection = dataEntryStructure.find((s) => s.id === "extra_investigation")!;
    expect(doesValidationResultApplyToSection(extraInvestigationW001, extraInvestigationSection)).toBe(true);

    const countingDifferencesPollingStationSection = dataEntryStructure.find(
      (s) => s.id === "counting_differences_polling_station",
    )!;
    expect(
      doesValidationResultApplyToSection(
        countingDifferencesPollingStationW001,
        countingDifferencesPollingStationSection,
      ),
    ).toBe(true);

    const votersVotesSection = dataEntryStructure.find((s) => s.id === "voters_votes_counts")!;
    expect(doesValidationResultApplyToSection(validationResultMockData.F201, votersVotesSection)).toBe(true);
    expect(doesValidationResultApplyToSection(validationResultMockData.F202, votersVotesSection)).toBe(true);
    expect(doesValidationResultApplyToSection(validationResultMockData.F203, votersVotesSection)).toBe(true);
    expect(doesValidationResultApplyToSection(validationResultMockData.W203, votersVotesSection)).toBe(true);

    const politicalGroupSection1 = dataEntryStructure.find((s) => s.id === "political_group_votes_1")!;
    expect(doesValidationResultApplyToSection(validationResultMockData.F401, politicalGroupSection1)).toBe(true);
  });

  test("should return false when validation result does not apply to section", () => {
    const dataEntryStructure = getDataEntryStructure(electionMockData);

    const extraInvestigationSection = dataEntryStructure.find((s) => s.id === "extra_investigation")!;
    expect(doesValidationResultApplyToSection(validationResultMockData.F201, extraInvestigationSection)).toBe(false);

    const countingDifferencesPollingStationSection = dataEntryStructure.find(
      (s) => s.id === "counting_differences_polling_station",
    )!;
    expect(
      doesValidationResultApplyToSection(validationResultMockData.F201, countingDifferencesPollingStationSection),
    ).toBe(false);

    const differencesSection = dataEntryStructure.find((s) => s.id === "differences_counts")!;
    expect(doesValidationResultApplyToSection(extraInvestigationW001, differencesSection)).toBe(false);
    expect(doesValidationResultApplyToSection(validationResultMockData.F201, differencesSection)).toBe(false);
    expect(doesValidationResultApplyToSection(validationResultMockData.F203, differencesSection)).toBe(false);

    const politicalGroupSection1 = dataEntryStructure.find((s) => s.id === "political_group_votes_1")!;
    expect(doesValidationResultApplyToSection(countingDifferencesPollingStationW001, politicalGroupSection1)).toBe(
      false,
    );
    expect(doesValidationResultApplyToSection(validationResultMockData.F301, politicalGroupSection1)).toBe(false);

    const politicalGroupSection2 = dataEntryStructure.find((s) => s.id === "political_group_votes_2")!;
    expect(doesValidationResultApplyToSection(validationResultMockData.F401, politicalGroupSection2)).toBe(false);
    expect(doesValidationResultApplyToSection(validationResultMockData.F202, politicalGroupSection2)).toBe(false);
  });
});

describe("getValidationResultSetForSection", () => {
  test("should return validation results for specific section", () => {
    const dataEntryStructure = getDataEntryStructure(electionMockData);
    const votersVotesSection = dataEntryStructure.find((s) => s.id === "voters_votes_counts")!;

    const validationResults = [
      validationResultMockData.F201, // voters_counts
      validationResultMockData.F202, // votes_counts
      validationResultMockData.F203, // votes_counts
      validationResultMockData.W203, // votes_counts and voters_counts
      validationResultMockData.F301, // differences_counts
      validationResultMockData.F401, // political_group_votes
    ];

    const resultSet = getValidationResultSetForSection(validationResults, votersVotesSection);

    expect(resultSet.size()).toBe(4);
    expect(resultSet.includes("F201")).toBe(true);
    expect(resultSet.includes("F203")).toBe(true);
    expect(resultSet.includes("W203")).toBe(true);
    expect(resultSet.includes("F202")).toBe(true);
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
      validationResultMockData.F301, // differences_counts
    ];

    const resultSet = getValidationResultSetForSection(validationResults, politicalGroupSection);

    expect(resultSet.size()).toBe(1);
    expect(resultSet.includes("F401")).toBe(true);
    expect(resultSet.includes("F301")).toBe(false);
  });
});

describe("dottedCode", () => {
  test("should insert a dot in between validation result code letter and number", () => {
    expect(dottedCode("F301")).toBe("F.301");
    expect(dottedCode("W203")).toBe("W.203");
  });
});

import { assert, describe, expect, test } from "vitest";

import { ValidationResult } from "@kiesraad/api";

import { defaultDataEntryState, errorWarningMocks, initialValues } from "../test.util";
import {
  addValidationResultToFormState,
  formSectionComplete,
  getErrorsAndWarnings,
  getNextSectionID,
  getPollingStationSummary,
  hasOnlyGlobalValidationResults,
  isGlobalValidationResult,
  resetFormSectionState,
} from "./dataEntryUtils";
import { ClientValidationResult } from "./types";

describe("addValidationResultToFormState", () => {
  test("should add validation result to form state", () => {
    const formState = structuredClone(defaultDataEntryState.formState);
    formState.sections.differences_counts.isSaved = true;
    const validationResults: ValidationResult[] = [
      {
        fields: ["data.differences_counts.fewer_ballots_count"],
        code: "F303",
      },
    ];

    addValidationResultToFormState(formState, validationResults, "errors");

    expect(formState.sections.differences_counts.errors.length).toBe(1);
  });

  test("addValidationResultToFormState adds result to multiple sections", () => {
    const formState = structuredClone(defaultDataEntryState.formState);

    formState.sections.voters_votes_counts.isSaved = true;
    if (formState.sections.political_group_votes_1) formState.sections.political_group_votes_1.isSaved = true;

    const validationResults: ValidationResult[] = [
      {
        fields: ["data.votes_counts.votes_candidates_count", "data.political_group_votes[0].total"],
        code: "F204",
      },
    ];

    addValidationResultToFormState(formState, validationResults, "errors");

    expect(formState.sections.voters_votes_counts.errors.length).toBe(1);
    const pg1 = formState.sections.political_group_votes_1;
    assert(pg1);
    expect(pg1.errors.length).toBe(1);
  });

  test("addValidationResultToFormState doesnt add errors to unsaved sections", () => {
    const formState = structuredClone(defaultDataEntryState.formState);
    formState.sections.differences_counts.isSaved = false;
    const validationResults: ValidationResult[] = [
      {
        fields: ["data.differences_counts.fewer_ballots_count"],
        code: "F303",
      },
    ];

    addValidationResultToFormState(formState, validationResults, "errors");

    expect(formState.sections.differences_counts.errors.length).toBe(0);
  });
});

describe("formSectionComplete", () => {
  test("formSectionComplete", () => {
    expect(
      formSectionComplete({
        index: 0,
        id: "recounted",
        isSaved: false,
        acceptWarnings: false,
        errors: [],
        warnings: [],
        hasChanges: false,
        acceptWarningsError: false,
      }),
    ).toBe(false);

    expect(
      formSectionComplete({
        index: 0,
        id: "recounted",
        isSaved: true,
        acceptWarnings: false,
        errors: [],
        warnings: [],
        hasChanges: false,
        acceptWarningsError: false,
      }),
    ).toBe(true);
  });
});

describe("hasOnlyGlobalValidationResults", () => {
  test("should check if array has only global validation results", () => {
    const onlyGlobalResults: ClientValidationResult[] = [
      {
        code: "F204",
        fields: ["data.votes_counts.votes_candidates_count", "data.political_group_votes"],
      },
    ];

    expect(hasOnlyGlobalValidationResults(onlyGlobalResults)).toBe(true);

    const onlyLocalResults: ClientValidationResult[] = [
      {
        code: "W201",
        fields: ["data.votes_counts.blank_votes_count"],
        isGlobal: false,
      },
      {
        code: "W202",
        fields: ["data.votes_counts.invalid_votes_count"],
        isGlobal: false,
      },
    ];

    expect(hasOnlyGlobalValidationResults(onlyLocalResults)).toBe(false);

    const mixedResults: ClientValidationResult[] = [
      {
        code: "F204",
        fields: ["data.votes_counts.votes_candidates_count", "data.political_group_votes"],
        isGlobal: true,
      },
      {
        code: "W201",
        fields: ["data.votes_counts.blank_votes_count"],
        isGlobal: false,
      },
    ];

    expect(hasOnlyGlobalValidationResults(mixedResults)).toBe(false);
  });
});

describe("resetFormSectionState", () => {
  test("should reset form section state", () => {
    const formState = {
      ...defaultDataEntryState.formState,
    };
    formState.sections.voters_votes_counts.errors = [
      {
        code: "W201",
        fields: ["data.votes_counts.blank_votes_count"],
      },
    ];

    resetFormSectionState(formState);

    expect(formState.sections.voters_votes_counts.errors.length).toBe(0);
  });
});

describe("getNextSectionID", () => {
  test("should get next section ID", () => {
    const formState = structuredClone(defaultDataEntryState.formState);
    formState.sections.recounted.isSaved = true;
    formState.sections.recounted.isSubmitted = true;

    const nextSection = getNextSectionID(formState);

    expect(nextSection).toBe("voters_votes_counts");
  });
});

describe("isGlobalValidationResult", () => {
  test("should check if validation result is global", () => {
    expect(
      isGlobalValidationResult({
        code: "F204",
        fields: ["data.votes_counts.votes_candidates_count", "data.political_group_votes"],
      }),
    ).toBe(true);

    expect(
      isGlobalValidationResult({
        code: "F303",
        fields: ["data.differences_counts.fewer_ballots_count"],
      }),
    ).toBe(false);

    expect(
      isGlobalValidationResult({
        code: "W301",
        fields: ["data.votes_counts.blank_votes_count"],
      }),
    ).toBe(false);
  });
});

describe("getErrorsAndWarnings", () => {
  test("getErrorsAndWarnings errors", () => {
    const errors: ValidationResult[] = [
      {
        code: "F201",
        fields: [
          "data.voters_counts.total_admitted_voters_count",
          "data.voters_counts.poll_card_count",
          "data.voters_counts.proxy_certificate_count",
          "data.voters_counts.voter_card_count",
        ],
      },
      {
        code: "F202",
        fields: [
          "data.votes_counts.total_votes_cast_count",
          "data.votes_counts.votes_candidates_count",
          "data.votes_counts.blank_votes_count",
          "data.votes_counts.invalid_votes_count",
        ],
      },
    ];

    const warnings: ValidationResult[] = [
      {
        code: "W201",
        fields: ["data.votes_counts.blank_votes_count"],
      },
    ];

    const errorsAndWarnings = getErrorsAndWarnings(errors, warnings);
    expect(errorsAndWarnings.get("blank_votes_count")).toBeDefined();
    expect(errorsAndWarnings.get("blank_votes_count")?.errors).toEqual(
      expect.arrayContaining([
        {
          code: "F202",
          id: "blank_votes_count",
        },
      ]),
    );

    //warnings should not be added if errors
    expect(errorsAndWarnings.get("blank_votes_count")?.warnings.length).toBe(0);
  });

  test("getErrorsAndWarnings warnings", () => {
    const errors: ValidationResult[] = [];

    const warnings: ValidationResult[] = [
      {
        code: "W201",
        fields: ["data.votes_counts.blank_votes_count"],
      },
    ];

    const errorsAndWarnings = getErrorsAndWarnings(errors, warnings);
    expect(errorsAndWarnings.get("blank_votes_count")).toBeDefined();
    expect(errorsAndWarnings.get("blank_votes_count")?.errors.length).toBe(0);
    expect(errorsAndWarnings.get("blank_votes_count")?.warnings).toEqual(
      expect.arrayContaining([
        {
          code: "W201",
          id: "blank_votes_count",
        },
      ]),
    );
  });
});

describe("getPollingStationSummary", () => {
  test("getPollingStationSummary", () => {
    const state = structuredClone(defaultDataEntryState.formState);
    const values = structuredClone(initialValues);

    values.voters_counts.poll_card_count = 4;
    values.voters_counts.total_admitted_voters_count = 4;
    values.votes_counts.votes_candidates_count = 4;
    values.votes_counts.total_votes_cast_count = 4;

    values.political_group_votes[0] = {
      number: 1,
      total: 4,
      candidate_votes: [
        {
          number: 1,
          votes: 4,
        },
      ],
    };

    let summary = getPollingStationSummary(state);
    expect(summary.countsAddUp).toBe(true);
    expect(summary.hasBlocks).toBe(false);
    expect(summary.hasWarnings).toBe(false);
    expect(summary.notableFormSections.length).toBe(0);

    state.sections.differences_counts.acceptWarnings = true;
    state.sections.differences_counts.warnings = [errorWarningMocks.W301];

    summary = getPollingStationSummary(state);
    expect(summary.countsAddUp).toBe(true);
    expect(summary.hasBlocks).toBe(false);
    expect(summary.hasWarnings).toBe(true);
    expect(summary.notableFormSections.length).toBe(1);
    expect(
      summary.notableFormSections.some(
        (item) => item.formSection.id === "differences_counts" && item.status === "accepted-warnings",
      ),
    );

    state.sections.voters_votes_counts.errors = [errorWarningMocks.F201];

    summary = getPollingStationSummary(state);

    expect(summary.countsAddUp).toBe(false);
    expect(summary.hasBlocks).toBe(true);
    expect(summary.hasWarnings).toBe(true);
    expect(summary.notableFormSections.length).toBe(2);
    expect(
      summary.notableFormSections.some(
        (item) => item.formSection.id === "voters_votes_counts" && item.status === "errors",
      ),
    );

    state.sections.differences_counts.acceptWarnings = false;

    summary = getPollingStationSummary(state);

    expect(summary.countsAddUp).toBe(false);
    expect(summary.hasBlocks).toBe(true);
    expect(summary.hasWarnings).toBe(true);
    expect(summary.notableFormSections.length).toBe(2);
    expect(
      summary.notableFormSections.some(
        (item) => item.formSection.id == "differences_counts" && item.status === "unaccepted-warnings",
      ),
    );
  });
});

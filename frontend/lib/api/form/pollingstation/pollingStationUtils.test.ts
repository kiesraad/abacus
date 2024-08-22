import { describe, expect, test } from "vitest";

import {
  addValidationResultToFormState,
  AnyFormReference,
  ClientValidationResult,
  currentFormHasChanges,
  FieldValidationResult,
  FormSection,
  formSectionComplete,
  FormState,
  getErrorsAndWarnings,
  getNextSection,
  hasOnlyGlobalValidationResults,
  isFormSectionEmpty,
  isGlobalValidationResult,
  PollingStationValues,
  resetFormSectionState,
  ValidationResult,
} from "@kiesraad/api";

const defaultFormState: FormState = {
  active: "recounted",
  current: "recounted",
  sections: {
    recounted: {
      index: 0,
      id: "recounted",
      isSaved: false,
      ignoreWarnings: false,
      errors: [],
      warnings: [],
    },
    voters_votes_counts: {
      index: 1,
      id: "voters_votes_counts",
      isSaved: false,
      ignoreWarnings: false,
      errors: [],
      warnings: [],
    },
    differences_counts: {
      index: 2,
      id: "differences_counts",
      isSaved: false,
      ignoreWarnings: false,
      errors: [],
      warnings: [],
    },
    political_group_votes_1: {
      index: 3,
      id: "political_group_votes_1",
      isSaved: false,
      ignoreWarnings: false,
      errors: [],
      warnings: [],
    },
    political_group_votes_2: {
      index: 4,
      id: "political_group_votes_2",
      isSaved: false,
      ignoreWarnings: false,
      errors: [],
      warnings: [],
    },
    save: {
      index: 5,
      id: "save",
      isSaved: false,
      ignoreWarnings: false,
      errors: [],
      warnings: [],
    },
  },
  unknown: {
    errors: [],
    warnings: [],
  },
  isCompleted: false,
};

const defaultValues: PollingStationValues = {
  recounted: undefined,
  voters_counts: {
    poll_card_count: 0,
    proxy_certificate_count: 0,
    voter_card_count: 0,
    total_admitted_voters_count: 0,
  },
  votes_counts: {
    votes_candidates_counts: 0,
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
  political_group_votes: [
    {
      number: 1,
      total: 0,
      candidate_votes: [
        {
          number: 1,
          votes: 0,
        },
      ],
    },
    {
      number: 2,
      total: 0,
      candidate_votes: [
        {
          number: 1,
          votes: 0,
        },
      ],
    },
  ],
};

describe("PollingStationUtils", () => {
  test("addValidationResultToFormState adds result to correct section", () => {
    const formState = structuredClone(defaultFormState);
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

  // FIXME: F.204 is a global error, so is this test relevant?
  test("addValidationResultToFormState adds result to multiple sections", () => {
    const formState = structuredClone(defaultFormState);

    formState.sections.voters_votes_counts.isSaved = true;
    if (formState.sections.political_group_votes_1)
      formState.sections.political_group_votes_1.isSaved = true;

    const validationResults: ValidationResult[] = [
      {
        fields: ["data.votes_counts.votes_candidates_counts", "data.political_group_votes"],
        code: "F204",
      },
    ];

    addValidationResultToFormState(formState, validationResults, "errors");

    expect(formState.sections.voters_votes_counts.errors.length).toBe(1);
  });

  test("addValidationResultToFormState doesnt add errors to unsaved sections", () => {
    const formState = structuredClone(defaultFormState);
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

  test("formSectionComplete", () => {
    expect(
      formSectionComplete({
        index: 0,
        id: "recounted",
        isSaved: false,
        ignoreWarnings: false,
        errors: [],
        warnings: [],
      }),
    ).toBe(false);

    expect(
      formSectionComplete({
        index: 0,
        id: "recounted",
        isSaved: true,
        ignoreWarnings: false,
        errors: [],
        warnings: [],
      }),
    ).toBe(true);
  });

  test("getNextSection", () => {
    const formState = structuredClone(defaultFormState);

    const nextSection = getNextSection(formState, {
      index: 0,
      id: "recounted",
      isSaved: false,
      ignoreWarnings: false,
      errors: [],
      warnings: [],
    });

    expect(nextSection).toBe("voters_votes_counts");
  });

  test("currentFormHasChanges", () => {
    const values = {
      ...defaultValues,
      differences_counts: {
        more_ballots_count: 0,
        fewer_ballots_count: 0,
        unreturned_ballots_count: 0,
        too_few_ballots_handed_out_count: 0,
        too_many_ballots_handed_out_count: 0,
        other_explanation_count: 0,
        no_explanation_count: 0,
      },
    };

    const currentForm: AnyFormReference = {
      id: "differences_counts",
      type: "differences",
      getValues: () => ({
        differences_counts: {
          //@ts-expect-error-next-line
          more_ballots_count: "",
          fewer_ballots_count: 0,
          unreturned_ballots_count: 0,
          too_few_ballots_handed_out_count: 0,
          too_many_ballots_handed_out_count: 0,
          other_explanation_count: 0,
          no_explanation_count: 0,
        },
      }),
    };

    expect(currentFormHasChanges(currentForm, values)).toBe(false);

    values.differences_counts.more_ballots_count = 1;

    expect(currentFormHasChanges(currentForm, values)).toBe(true);
  });

  test("resetFormSectionState", () => {
    const formState = {
      ...defaultFormState,
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

  test("isGlobalValidationResult", () => {
    expect(
      isGlobalValidationResult({
        code: "F204",
        fields: ["data.votes_counts.votes_candidates_counts", "data.political_group_votes"],
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

  test("hasOnlyGlobalValidationResults", () => {
    const onlyGlobalResults: ClientValidationResult[] = [
      {
        code: "F204",
        fields: ["data.votes_counts.votes_candidates_counts", "data.political_group_votes"],
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
        fields: ["data.votes_counts.votes_candidates_counts", "data.political_group_votes"],
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

  test("getErrorsAndWarnings errors and clientWarnings", () => {
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
          "data.votes_counts.votes_candidates_counts",
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

    const clientWarnings: FieldValidationResult[] = [
      {
        code: "W201",
        id: "blank_votes_count",
      },
    ];

    const errorsAndWarnings = getErrorsAndWarnings(errors, warnings, clientWarnings);
    expect(errorsAndWarnings.get("blank_votes_count")).toBeDefined();
    expect(errorsAndWarnings.get("blank_votes_count")?.errors.length).toBe(1);
    //warnings should not be added if errors.
    expect(errorsAndWarnings.get("blank_votes_count")?.warnings.length).toBe(1);
  });
  test("getErrorsAndWarnings warnings and clientWarnings", () => {
    const errors: ValidationResult[] = [];

    const warnings: ValidationResult[] = [
      {
        code: "W201",
        fields: ["data.votes_counts.blank_votes_count"],
      },
    ];

    const clientWarnings: FieldValidationResult[] = [
      {
        code: "W201",
        id: "blank_votes_count",
      },
    ];

    const errorsAndWarnings = getErrorsAndWarnings(errors, warnings, clientWarnings);
    expect(errorsAndWarnings.get("blank_votes_count")).toBeDefined();
    expect(errorsAndWarnings.get("blank_votes_count")?.errors.length).toBe(0);
    expect(errorsAndWarnings.get("blank_votes_count")?.warnings.length).toBe(2);
  });

  test("isFormSectionEmpty", () => {
    const formSection: FormSection = {
      index: 0,
      id: "voters_votes_counts",
      isSaved: false,
      ignoreWarnings: false,
      errors: [],
      warnings: [],
    };
    const values = structuredClone(defaultValues);
    expect(isFormSectionEmpty(formSection, values)).toBe(true);

    values.voters_counts.poll_card_count = 1;
    expect(isFormSectionEmpty(formSection, values)).toBe(false);
  });
});

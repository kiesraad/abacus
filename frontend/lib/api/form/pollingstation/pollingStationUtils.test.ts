import { describe, expect, test } from "vitest";

import { ValidationResult } from "@kiesraad/api";

import {
  AnyFormReference,
  ClientValidationResult,
  FormState,
  PollingStationValues,
} from "./PollingStationFormController";
import {
  addValidationResultToFormState,
  currentFormHasChanges,
  formSectionComplete,
  getNextSection,
  hasOnlyGlobalValidationResults,
  isGlobalValidationResult,
  resetFormSectionState,
} from "./pollingStationUtils";

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
      id: "political_group_votes_1",
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

    const validationResults: ValidationResult[] = [
      {
        fields: ["data.votes_counts.blank_votes_count"],
        code: "F401",
      },
    ];

    addValidationResultToFormState(formState, validationResults, "errors");

    expect(formState.sections.voters_votes_counts.errors.length).toBe(1);
  });

  test("addValidationResultToFormState adds result to multiple sections", () => {
    const formState = structuredClone(defaultFormState);

    const validationResults: ValidationResult[] = [
      {
        fields: ["data.votes_counts.invalid_votes_count", "data.political_group_votes[0]"],
        code: "F401",
      },
    ];

    addValidationResultToFormState(formState, validationResults, "errors");

    console.log(formState.sections.voters_votes_counts.errors);
    expect(formState.sections.voters_votes_counts.errors.length).toBe(1);
    expect(formState.sections.political_group_votes_1?.errors.length).toBe(1);
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
          more_ballots_count: 0,
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
        code: "W203",
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
        fields: ["data.votes_counts.blank_votes_count"],
      }),
    ).toBe(true);

    expect(
      isGlobalValidationResult({
        code: "F401",
        fields: ["data.votes_counts.blank_votes_count"],
      }),
    ).toBe(false);

    expect(
      isGlobalValidationResult({
        code: "W304",
        fields: ["data.votes_counts.blank_votes_count"],
      }),
    ).toBe(false);
  });

  test("hasOnlyGlobalValidationResults", () => {
    const onlyGlobalResults: ClientValidationResult[] = [
      {
        code: "F204",
        fields: ["data.votes_counts.blank_votes_count"],
      },
    ];

    expect(hasOnlyGlobalValidationResults(onlyGlobalResults)).toBe(true);

    const onlyLocalResults: ClientValidationResult[] = [
      {
        code: "W203",
        fields: ["data.votes_counts.blank_votes_count"],
        isGlobal: false,
      },
      {
        code: "W203",
        fields: ["data.votes_counts.blank_votes_count"],
        isGlobal: false,
      },
    ];

    expect(hasOnlyGlobalValidationResults(onlyLocalResults)).toBe(false);

    const mixedResults: ClientValidationResult[] = [
      {
        code: "F204",
        fields: ["data.votes_counts.blank_votes_count"],
        isGlobal: true,
      },
      {
        code: "W203",
        fields: ["data.votes_counts.blank_votes_count"],
        isGlobal: false,
      },
    ];

    expect(hasOnlyGlobalValidationResults(mixedResults)).toBe(false);
  });
});

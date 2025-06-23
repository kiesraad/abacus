import { describe, expect, test } from "vitest";

import {
  errorWarningMocks,
  getDefaultDataEntryState,
  getDefaultFormSection,
  getInitialValues,
} from "../testing/mock-data";
import {
  formSectionComplete,
  getNextSectionID,
  isFormSectionEmpty,
  objectHasOnlyEmptyValues,
  resetFormSectionState,
} from "./dataEntryUtils";
import { ValidationResultSet } from "./ValidationResults";

describe("objectHasOnlyEmptyValues", () => {
  test("objectHasOnlyEmptyValues", () => {
    expect(objectHasOnlyEmptyValues({ foo: "" })).equals(true);
    expect(objectHasOnlyEmptyValues({ foo: 0 })).equals(true);
    expect(objectHasOnlyEmptyValues({ foo: 1 })).equals(false);
    expect(objectHasOnlyEmptyValues({ foo: 1, bar: "", baz: "" })).equals(false);
  });
});

describe("formSectionComplete", () => {
  test("formSectionComplete", () => {
    expect(
      formSectionComplete({
        index: 0,
        id: "recounted",
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
        id: "recounted",
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
    formState.sections.voters_votes_counts.errors = new ValidationResultSet([errorWarningMocks.W201]);

    resetFormSectionState(formState);

    expect(formState.sections.voters_votes_counts.errors.size()).toBe(0);
  });
});

describe("getNextSectionID", () => {
  test("should get next section ID", () => {
    const formState = getDefaultDataEntryState().formState;
    formState.sections.recounted.isSaved = true;
    formState.sections.recounted.isSubmitted = true;

    const nextSection = getNextSectionID(formState);

    expect(nextSection).toBe("voters_votes_counts");
  });
});

describe("isFormSectionEmpty", () => {
  test("political group form is empty", () => {
    const section = getDefaultFormSection("political_group_votes_1", 0);
    const values = getInitialValues();

    expect(isFormSectionEmpty(section, values)).toBeTruthy();
  });

  test("political group form: total is not empty", () => {
    const section = getDefaultFormSection("political_group_votes_1", 0);
    const values = getInitialValues();
    values.political_group_votes[0]!.total = 100;

    expect(isFormSectionEmpty(section, values)).toBeFalsy();
  });

  test("political group formL: candidate votes is not empty", () => {
    const section = getDefaultFormSection("political_group_votes_1", 0);
    const values = getInitialValues();
    values.political_group_votes[0]!.candidate_votes[0]!.votes = 100;

    expect(isFormSectionEmpty(section, values)).toBeFalsy();
  });

  test("voters and votes form is empty", () => {
    const section = getDefaultFormSection("political_group_votes_1", 0);
    const values = getInitialValues();

    expect(isFormSectionEmpty(section, values)).toBeTruthy();
  });

  test("voters and votes form: votes is not empty", () => {
    const section = getDefaultFormSection("voters_votes_counts", 0);
    const values = getInitialValues();
    values.votes_counts.invalid_votes_count = 3;

    expect(isFormSectionEmpty(section, values)).toBeFalsy();
  });

  test("voters and votes form: voters is not empty", () => {
    const section = getDefaultFormSection("voters_votes_counts", 0);
    const values = getInitialValues();
    values.voters_counts.total_admitted_voters_count = 6;

    expect(isFormSectionEmpty(section, values)).toBeFalsy();
  });

  test("differences form is empty", () => {
    const section = getDefaultFormSection("differences_counts", 0);
    const values = getInitialValues();

    expect(isFormSectionEmpty(section, values)).toBeTruthy();
  });

  test("differences form is not empty", () => {
    const section = getDefaultFormSection("differences_counts", 0);
    const values = getInitialValues();
    values.differences_counts.more_ballots_count = 5;

    expect(isFormSectionEmpty(section, values)).toBeFalsy();
  });

  test("recounted form is empty", () => {
    const section = getDefaultFormSection("recounted", 0);
    const values = getInitialValues();

    expect(isFormSectionEmpty(section, values)).toBeTruthy();
  });

  test("recounted form is not empty", () => {
    const section = getDefaultFormSection("recounted", 0);
    const values = getInitialValues();
    values.recounted = false;

    expect(isFormSectionEmpty(section, values)).toBeFalsy();
  });
});

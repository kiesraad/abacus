import { describe, expect, test } from "vitest";

import { errorWarningMocks, getDefaultDataEntryState, getInitialValues } from "../test-data";
import { formSectionComplete, getDataEntrySummary, getNextSectionID, resetFormSectionState } from "./dataEntryUtils";
import { ValidationResultSet } from "./ValidationResults";

describe("formSectionComplete", () => {
  test("formSectionComplete", () => {
    expect(
      formSectionComplete({
        index: 0,
        id: "recounted",
        isSaved: false,
        acceptWarnings: false,
        errors: new ValidationResultSet(),
        warnings: new ValidationResultSet(),
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
        errors: new ValidationResultSet(),
        warnings: new ValidationResultSet(),
        hasChanges: false,
        acceptWarningsError: false,
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

describe("getPollingStationSummary", () => {
  test("getPollingStationSummary", () => {
    const state = getDefaultDataEntryState().formState;
    const values = getInitialValues();

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

    let summary = getDataEntrySummary(state);
    expect(summary.countsAddUp).toBe(true);
    expect(summary.hasBlocks).toBe(false);
    expect(summary.hasWarnings).toBe(false);
    expect(summary.notableFormSections.length).toBe(0);

    state.sections.differences_counts.acceptWarnings = true;
    state.sections.differences_counts.warnings = new ValidationResultSet([errorWarningMocks.W301]);

    summary = getDataEntrySummary(state);
    expect(summary.countsAddUp).toBe(true);
    expect(summary.hasBlocks).toBe(false);
    expect(summary.hasWarnings).toBe(true);
    expect(summary.notableFormSections.length).toBe(1);
    expect(
      summary.notableFormSections.some(
        (item) => item.formSection.id === "differences_counts" && item.status === "accepted-warnings",
      ),
    );

    state.sections.voters_votes_counts.errors = new ValidationResultSet([errorWarningMocks.F201]);

    summary = getDataEntrySummary(state);

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

    summary = getDataEntrySummary(state);

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

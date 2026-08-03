import { describe, expect, test } from "vitest";

import { resultsMockData } from "@/features/resolve_differences/testing/polling-station-results";
import {
  type CorrectEntry,
  getResolveDifferencesAction,
  isCorrectionBlocked,
  sectionHasDifferences,
  type WrongEntryAction,
} from "@/features/resolve_differences/utils/differences";
import { dataEntryStatusDifferences } from "@/testing/api-mocks/DataEntryMockData";
import { electionMockData } from "@/testing/api-mocks/ElectionMockData";
import type { ResolveDifferencesAction } from "@/types/generated/openapi";
import { getDataEntryStructure } from "@/utils/dataEntryStructure";

describe("Resolve differences, differences util", () => {
  const first = resultsMockData(true);
  const second = resultsMockData(false);
  const structure = getDataEntryStructure("CSOFirstSession", electionMockData);

  test.each([
    { sectionId: "voters_votes_counts", expected: true },
    { sectionId: "differences_counts", expected: false },
    { sectionId: "political_group_votes_1", expected: true },
    { sectionId: "political_group_votes_2", expected: false },
  ])("sectionHasDifferences for $sectionId section", ({ sectionId, expected }) => {
    expect(sectionHasDifferences(structure.find((s) => s.id === sectionId)!, first, second)).toBe(expected);
  });
});

describe("getResolveDifferencesAction", () => {
  test.each<{
    correctEntry: CorrectEntry | undefined;
    wrongEntryAction: WrongEntryAction | undefined;
    expected: ResolveDifferencesAction | undefined;
  }>([
    { correctEntry: "first", wrongEntryAction: "correct", expected: "keep_first_and_correct_second" },
    { correctEntry: "first", wrongEntryAction: "discard", expected: "keep_first_and_discard_second" },
    { correctEntry: "second", wrongEntryAction: "correct", expected: "keep_second_and_correct_first" },
    { correctEntry: "second", wrongEntryAction: "discard", expected: "keep_second_and_discard_first" },
    // "neither" ignores the second question
    { correctEntry: "neither", wrongEntryAction: undefined, expected: "discard_both" },
    { correctEntry: "neither", wrongEntryAction: "correct", expected: "discard_both" },
    // incomplete answers map to undefined
    { correctEntry: undefined, wrongEntryAction: undefined, expected: undefined },
    { correctEntry: undefined, wrongEntryAction: "discard", expected: undefined },
    { correctEntry: "first", wrongEntryAction: undefined, expected: undefined },
    { correctEntry: "second", wrongEntryAction: undefined, expected: undefined },
  ])("maps ($correctEntry, $wrongEntryAction) to $expected", ({ correctEntry, wrongEntryAction, expected }) => {
    expect(getResolveDifferencesAction(correctEntry, wrongEntryAction)).toBe(expected);
  });
});

describe("isCorrectionBlocked", () => {
  test.each<{
    correctEntry: CorrectEntry | undefined;
    firstHasErrors: boolean;
    secondHasErrors: boolean;
    expected: boolean;
  }>([
    // errors in the entry that is kept block correcting the other one
    { correctEntry: "first", firstHasErrors: true, secondHasErrors: false, expected: true },
    { correctEntry: "first", firstHasErrors: false, secondHasErrors: true, expected: false },
    { correctEntry: "second", firstHasErrors: false, secondHasErrors: true, expected: true },
    { correctEntry: "second", firstHasErrors: true, secondHasErrors: false, expected: false },
    { correctEntry: "first", firstHasErrors: true, secondHasErrors: true, expected: true },
    { correctEntry: "second", firstHasErrors: true, secondHasErrors: true, expected: true },
    { correctEntry: "first", firstHasErrors: false, secondHasErrors: false, expected: false },
    { correctEntry: "second", firstHasErrors: false, secondHasErrors: false, expected: false },
    // there is nothing to correct when both entries are discarded, or when no choice was made yet
    { correctEntry: "neither", firstHasErrors: true, secondHasErrors: true, expected: false },
    { correctEntry: undefined, firstHasErrors: true, secondHasErrors: true, expected: false },
  ])("maps (keeping $correctEntry with errors in first: $firstHasErrors, second: $secondHasErrors) to $expected", ({
    correctEntry,
    firstHasErrors,
    secondHasErrors,
    expected,
  }) => {
    const differences = {
      ...dataEntryStatusDifferences,
      first_entry_has_errors: firstHasErrors,
      second_entry_has_errors: secondHasErrors,
    };

    expect(isCorrectionBlocked(correctEntry, differences)).toBe(expected);
  });

  test("is not blocked while the differences are still loading", () => {
    expect(isCorrectionBlocked("first", null)).toBe(false);
    expect(isCorrectionBlocked("second", null)).toBe(false);
  });
});

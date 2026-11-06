import { describe, expect, test } from "vitest";

import { resultsMockData } from "@/features/resolve_differences/testing/polling-station-results";
import {
  type CorrectEntry,
  type CorrectionBlockedReason,
  getResolveDifferencesAction,
  isCorrectionBlocked,
  sectionHasDifferences,
  type WrongEntryAction,
} from "@/features/resolve_differences/utils/differences";
import { dataEntryStatusDifferences } from "@/testing/api-mocks/DataEntryMockData";
import { electionMockData } from "@/testing/api-mocks/ElectionMockData";
import type { DataEntryOrigin, ResolveDifferencesAction } from "@/types/generated/openapi";
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
    firstEntryImported: boolean;
    expected: CorrectionBlockedReason | undefined;
  }>([
    // errors in the entry that is kept block correcting the other one
    {
      correctEntry: "first",
      firstHasErrors: true,
      secondHasErrors: false,
      firstEntryImported: true,
      expected: "first_entry_has_errors",
    },
    {
      correctEntry: "first",
      firstHasErrors: true,
      secondHasErrors: false,
      firstEntryImported: false,
      expected: "first_entry_has_errors",
    },
    {
      correctEntry: "first",
      firstHasErrors: false,
      secondHasErrors: true,
      firstEntryImported: true,
      expected: undefined,
    },
    {
      correctEntry: "first",
      firstHasErrors: false,
      secondHasErrors: true,
      firstEntryImported: false,
      expected: undefined,
    },
    {
      correctEntry: "second",
      firstHasErrors: false,
      secondHasErrors: true,
      firstEntryImported: true,
      expected: "second_entry_has_errors",
    },
    {
      correctEntry: "second",
      firstHasErrors: false,
      secondHasErrors: true,
      firstEntryImported: false,
      expected: "second_entry_has_errors",
    },
    {
      correctEntry: "second",
      firstHasErrors: true,
      secondHasErrors: false,
      firstEntryImported: true,
      expected: "first_entry_imported",
    },
    {
      correctEntry: "second",
      firstHasErrors: true,
      secondHasErrors: false,
      firstEntryImported: false,
      expected: undefined,
    },
    {
      correctEntry: "first",
      firstHasErrors: true,
      secondHasErrors: true,
      firstEntryImported: true,
      expected: "first_entry_has_errors",
    },
    {
      correctEntry: "first",
      firstHasErrors: true,
      secondHasErrors: true,
      firstEntryImported: false,
      expected: "first_entry_has_errors",
    },
    {
      correctEntry: "second",
      firstHasErrors: true,
      secondHasErrors: true,
      firstEntryImported: true,
      expected: "second_entry_has_errors",
    },
    {
      correctEntry: "second",
      firstHasErrors: true,
      secondHasErrors: true,
      firstEntryImported: false,
      expected: "second_entry_has_errors",
    },
    {
      correctEntry: "first",
      firstHasErrors: false,
      secondHasErrors: false,
      firstEntryImported: true,
      expected: undefined,
    },
    {
      correctEntry: "first",
      firstHasErrors: false,
      secondHasErrors: false,
      firstEntryImported: false,
      expected: undefined,
    },
    {
      correctEntry: "second",
      firstHasErrors: false,
      secondHasErrors: false,
      firstEntryImported: true,
      expected: "first_entry_imported",
    },
    {
      correctEntry: "second",
      firstHasErrors: false,
      secondHasErrors: false,
      firstEntryImported: false,
      expected: undefined,
    },
    // there is nothing to correct when both entries are discarded, or when no choice was made yet
    {
      correctEntry: "neither",
      firstHasErrors: true,
      secondHasErrors: true,
      firstEntryImported: true,
      expected: undefined,
    },
    {
      correctEntry: undefined,
      firstHasErrors: true,
      secondHasErrors: true,
      firstEntryImported: true,
      expected: undefined,
    },
  ])("maps (keeping $correctEntry with errors in first: $firstHasErrors, second: $secondHasErrors and imported: $firstEntryImported) to $expected", ({
    correctEntry,
    firstHasErrors,
    secondHasErrors,
    firstEntryImported,
    expected,
  }) => {
    const differences = {
      ...dataEntryStatusDifferences,
      first_entry_has_errors: firstHasErrors,
      second_entry_has_errors: secondHasErrors,
      first_entry_origin: firstEntryImported
        ? ({ type: "Import" } as DataEntryOrigin)
        : ({ type: "Typist", user_id: 1 } as DataEntryOrigin),
    };

    expect(isCorrectionBlocked(correctEntry, differences)).toBe(expected);
  });

  test("is not blocked while the differences are still loading", () => {
    expect(isCorrectionBlocked("first", null)).toBe(undefined);
    expect(isCorrectionBlocked("second", null)).toBe(undefined);
  });
});

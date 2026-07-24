import { describe, expect, test } from "vitest";

import { resultsMockData } from "@/features/resolve_differences/testing/polling-station-results";
import {
  type CorrectEntry,
  getResolveDifferencesAction,
  sectionHasDifferences,
  type WrongEntryAction,
} from "@/features/resolve_differences/utils/differences";
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
    { correctEntry: "first", wrongEntryAction: "reenter", expected: "keep_first_and_discard_second" },
    { correctEntry: "second", wrongEntryAction: "correct", expected: "keep_second_and_correct_first" },
    { correctEntry: "second", wrongEntryAction: "reenter", expected: "keep_second_and_discard_first" },
    // "neither" ignores the second question
    { correctEntry: "neither", wrongEntryAction: undefined, expected: "discard_both" },
    { correctEntry: "neither", wrongEntryAction: "correct", expected: "discard_both" },
    // incomplete answers map to undefined
    { correctEntry: undefined, wrongEntryAction: undefined, expected: undefined },
    { correctEntry: undefined, wrongEntryAction: "reenter", expected: undefined },
    { correctEntry: "first", wrongEntryAction: undefined, expected: undefined },
    { correctEntry: "second", wrongEntryAction: undefined, expected: undefined },
  ])("maps ($correctEntry, $wrongEntryAction) to $expected", ({ correctEntry, wrongEntryAction, expected }) => {
    expect(getResolveDifferencesAction(correctEntry, wrongEntryAction)).toBe(expected);
  });
});

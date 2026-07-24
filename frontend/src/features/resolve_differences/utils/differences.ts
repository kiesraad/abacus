import type { ResolveDifferencesAction } from "@/types/generated/openapi";
import type { DataEntryResults, DataEntrySection } from "@/types/types";
import { mapResultsToSectionValues } from "@/utils/dataEntryMapping";

/** Answer to the first question: which entry matches the paper report? */
export type CorrectEntry = "first" | "second" | "neither";

/** Answer to the second question: what to do with the entry that does not match? */
export type WrongEntryAction = "correct" | "reenter";

/** Map the two questions to the API action. Returns `undefined` if  the answers are incomplete. */
export function getResolveDifferencesAction(
  correctEntry: CorrectEntry | undefined,
  wrongEntryAction: WrongEntryAction | undefined,
): ResolveDifferencesAction | undefined {
  switch (correctEntry) {
    case "first":
      switch (wrongEntryAction) {
        case "correct":
          return "keep_first_and_correct_second";
        case "reenter":
          return "keep_first_and_discard_second";
        default:
          return undefined;
      }
    case "second":
      switch (wrongEntryAction) {
        case "correct":
          return "keep_second_and_correct_first";
        case "reenter":
          return "keep_second_and_discard_first";
        default:
          return undefined;
      }
    case "neither":
      return "discard_both";
    default:
      return undefined;
  }
}

/** Which of the two questions still need an answer at submit time. */
export function getUnansweredQuestions(
  correctEntry: CorrectEntry | undefined,
  wrongEntryAction: WrongEntryAction | undefined,
): { correctEntry: boolean; wrongEntry: boolean } {
  return {
    correctEntry: correctEntry === undefined,
    wrongEntry: (correctEntry === "first" || correctEntry === "second") && wrongEntryAction === undefined,
  };
}

export function sectionHasDifferences(
  section: DataEntrySection,
  first: DataEntryResults,
  second: DataEntryResults,
): boolean {
  const firstValues = mapResultsToSectionValues(section, first);
  const secondValues = mapResultsToSectionValues(section, second);

  const firstKeys = Object.keys(firstValues);
  const secondKeys = Object.keys(secondValues);

  // Check if the number of keys differs
  if (firstKeys.length !== secondKeys.length) {
    return true;
  }

  // Check if all keys from first object exist in second object
  for (const key of firstKeys) {
    if (!(key in secondValues)) {
      return true;
    }
  }

  // Check if any values differ
  for (const key of firstKeys) {
    if (firstValues[key] !== secondValues[key]) {
      return true;
    }
  }

  return false;
}

import type { ResolveDifferencesAction } from "@/types/generated/openapi";
import type { DataEntryResults, DataEntrySection } from "@/types/types";
import { mapResultsToSectionValues } from "@/utils/dataEntryMapping";

/** Answer to the first question: which entry matches the paper report? */
export type CorrectEntry = "first" | "second" | "neither";

/** Answer to the second question: what to do with the entry that does not match? */
export type WrongEntryAction = "correct" | "reenter";

/** The form fields and setters shared between the resolve differences hook and form. */
export interface ResolveDifferencesFormState {
  correctEntry: CorrectEntry | undefined;
  setCorrectEntry: (correctEntry: CorrectEntry) => void;
  wrongEntryAction: WrongEntryAction | undefined;
  setWrongEntryAction: (wrongEntryAction: WrongEntryAction) => void;
  correctEntryError: string | undefined;
  wrongEntryError: string | undefined;
}

const KEEP_ENTRY_ACTIONS = {
  first: { correct: "keep_first_and_correct_second", reenter: "keep_first_and_discard_second" },
  second: { correct: "keep_second_and_correct_first", reenter: "keep_second_and_discard_first" },
} as const;

/** Map the two questions to the API action. Returns `undefined` if the answers are incomplete. */
export function getResolveDifferencesAction(
  correctEntry: CorrectEntry | undefined,
  wrongEntryAction: WrongEntryAction | undefined,
): ResolveDifferencesAction | undefined {
  if (correctEntry === "neither") {
    return "discard_both";
  }
  if (correctEntry === undefined || wrongEntryAction === undefined) {
    return undefined;
  }
  return KEEP_ENTRY_ACTIONS[correctEntry][wrongEntryAction];
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

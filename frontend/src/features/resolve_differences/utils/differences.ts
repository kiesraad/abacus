import { t } from "@/i18n/translate";
import type { DataEntryGetDifferencesResponse, ResolveDifferencesAction } from "@/types/generated/openapi";
import type { DataEntryResults, DataEntrySection } from "@/types/types";
import { mapResultsToSectionValues } from "@/utils/dataEntryMapping";

/** Answer to the first question: which entry matches the paper report? */
export type CorrectEntry = "first" | "second" | "neither";

/** Answer to the second question: what to do with the entry that does not match? */
export type WrongEntryAction = "correct" | "discard";

/** Reasons for blocking a correction */
export type CorrectionBlockedReason = "first_entry_has_errors" | "first_entry_imported" | "second_entry_has_errors";

/** The form fields and setters shared between the resolve differences hook and form. */
export interface ResolveDifferencesFormState {
  correctEntry: CorrectEntry | undefined;
  setCorrectEntry: (correctEntry: CorrectEntry) => void;
  wrongEntryAction: WrongEntryAction | undefined;
  setWrongEntryAction: (wrongEntryAction: WrongEntryAction) => void;
  correctionBlocked: CorrectionBlockedReason | undefined;
  correctEntryError: string | undefined;
  wrongEntryError: string | undefined;
}

/** Correcting the other entry is blocked when the entry that is kept has errors
 * or if the other entry is an imported first entry. */
export function isCorrectionBlocked(
  correctEntry: CorrectEntry | undefined,
  differences: DataEntryGetDifferencesResponse | null,
): CorrectionBlockedReason | undefined {
  if (correctEntry === "first") {
    return differences?.first_entry_has_errors ? "first_entry_has_errors" : undefined;
  }
  if (correctEntry === "second" && differences) {
    return differences.second_entry_has_errors
      ? "second_entry_has_errors"
      : differences.first_entry_origin.type === "Import"
        ? "first_entry_imported"
        : undefined;
  }
  return undefined;
}

export function effectiveWrongEntryAction(
  correctEntry: CorrectEntry | undefined,
  wrongEntryAction: WrongEntryAction | undefined,
  correctionBlocked: boolean,
): WrongEntryAction | undefined {
  return correctEntry === "neither" || correctionBlocked ? "discard" : wrongEntryAction;
}

const KEEP_ENTRY_ACTIONS = {
  first: { correct: "keep_first_and_correct_second", discard: "keep_first_and_discard_second" },
  second: { correct: "keep_second_and_correct_first", discard: "keep_second_and_discard_first" },
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

/** The error to show for each of the two questions at submit time. */
export function getQuestionErrors(
  correctEntry: CorrectEntry | undefined,
  wrongEntryAction: WrongEntryAction | undefined,
  submitted: boolean,
): Pick<ResolveDifferencesFormState, "correctEntryError" | "wrongEntryError"> {
  const requiredError = submitted ? t("resolve_differences.required_error") : undefined;
  const wrongEntryUnanswered =
    (correctEntry === "first" || correctEntry === "second") && wrongEntryAction === undefined;

  return {
    correctEntryError: correctEntry === undefined ? requiredError : undefined,
    wrongEntryError: wrongEntryUnanswered ? requiredError : undefined,
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

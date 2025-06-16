import { PollingStationResults } from "./generated/openapi";

export type FormSectionId =
  | "recounted"
  | "voters_votes_counts"
  | "differences_counts"
  | `political_group_votes_${number}`
  | "save";

type ObjectPath<T> = {
  // For each entry, if it is an object (including optional)
  [K in keyof T]: NonNullable<T[K]> extends object
    ? T[K] extends unknown[]
      ? never // Skip arrays, which are also objects
      : `${K & string}.${Extract<keyof NonNullable<T[K]>, string>}` // "parent.child" template literal for string keys
    : K & string; // else, the key itself when it is a string
}[keyof T]; // Get all values together

export type PollingStationResultsPath =
  | NonNullable<ObjectPath<PollingStationResults>>
  | `political_group_votes[${number}].candidate_votes[${number}].votes`
  | `political_group_votes[${number}].total`;

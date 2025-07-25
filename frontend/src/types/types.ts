import { PollingStationResults } from "./generated/openapi";

export type FormSectionId = "voters_votes_counts" | "differences_counts" | `political_group_votes_${number}` | "save";

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

export type SectionValues = Record<string, string>;

// Data Entry Section Types
export interface HeadingSubsection {
  type: "heading";
  title: string;
}

export interface MessageSubsection {
  type: "message";
  message: string;
  className?: string;
}

export interface RadioSubsectionOption {
  value: string;
  /** Label for data entry form view */
  label: string;
  /** Short label for differences view */
  short_label: string;
  autoFocusInput?: boolean;
}

export interface RadioSubsection {
  type: "radio";
  /** Short title for differences view */
  short_title: string;
  error: string;
  path: PollingStationResultsPath;
  options: RadioSubsectionOption[];
  valueType?: "string" | "boolean";
}

export interface CheckboxesSubsectionOption {
  path: PollingStationResultsPath;
  /** Label for data entry form view */
  label: string;
  /** Short label for differences view */
  short_label: string;
  autoFocusInput?: boolean;
}

export interface CheckboxesSubsection {
  type: "checkboxes";
  /** Short title for differences view */
  short_title: string;
  /** Path in results object that will indicate an error */
  error_path: PollingStationResultsPath;
  /** Error message to be shown when there is an error for error_path */
  error_message: string;
  options: CheckboxesSubsectionOption[];
}

export interface InputGridSubsectionRow {
  code?: string;
  path: PollingStationResultsPath;
  title: string;
  isTotal?: boolean;
  isListTotal?: boolean;
  addSeparator?: boolean;
  autoFocusInput?: boolean;
}

export interface InputGridSubsection {
  type: "inputGrid";
  headers: [string, string, string];
  zebra?: boolean;
  rows: InputGridSubsectionRow[];
}

export type DataEntrySubsection =
  | HeadingSubsection
  | MessageSubsection
  | RadioSubsection
  | InputGridSubsection
  | CheckboxesSubsection;

export interface DataEntrySection {
  id: FormSectionId;
  title: string;
  short_title: string;
  sectionNumber?: string;
  subsections: DataEntrySubsection[];
}

export type DataEntryStructure = DataEntrySection[];

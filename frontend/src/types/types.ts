import { ReactElement } from "react";

export type FormSectionId = string;
export type PollingStationResultsPath = string;

export type SectionValues = Record<string, string>;

// Data Entry Section Types
export interface HeadingSubsection {
  type: "heading";
  title: string;
}

export interface MessageSubsection {
  type: "message";
  message: string;
}

export interface RadioSubsectionOption {
  value: "true" | "false";
  /** Label for data entry form view */
  label: string;
  /** Short label for differences view */
  short_label: string;
  autoFocusInput?: boolean;
}

export interface RadioSubsection {
  type: "radio";
  /** Title to display above the radio buttons */
  title?: string;
  /** Description to display above the checkboxes */
  description?: string;
  /** Short title for differences view */
  short_title: string;
  error: string;
  path: PollingStationResultsPath;
  options: RadioSubsectionOption[];
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
  /** Title to display above the checkboxes */
  title?: string | ReactElement;
  /** Description to display above the checkboxes */
  description?: string;
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

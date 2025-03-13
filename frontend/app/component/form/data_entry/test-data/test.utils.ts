import { expect } from "vitest";

import { GetDataEntryResponse, PoliticalGroup, PollingStationResults } from "@kiesraad/api";
import { overrideOnce, screen, within } from "@kiesraad/test";

import { getClientState } from "../state/dataEntryUtils";
import { FormState } from "../state/types";
import { getInitialValues } from "./mock-data";

export interface OverrideServerGetDataEntryResponseProps {
  formState: FormState;
  pollingStationResults: Partial<PollingStationResults>;
  acceptWarnings?: boolean;
  continueToNextSection?: boolean;
  progress?: number;
  validationResults?: GetDataEntryResponse["validation_results"];
}

export function overrideServerGetDataEntryResponse({
  formState,
  pollingStationResults,
  acceptWarnings = false,
  continueToNextSection = true,
  progress = 1,
  validationResults = { errors: [], warnings: [] },
}: OverrideServerGetDataEntryResponseProps) {
  const initialValues = getInitialValues();
  overrideOnce("get", "/api/polling_stations/1/data_entries/1", 200, {
    client_state: getClientState(formState, acceptWarnings, continueToNextSection),
    data: {
      ...initialValues,
      ...pollingStationResults,
    },
    progress,
    updated_at: "",
    validation_results: validationResults,
  } satisfies GetDataEntryResponse);
}

export function expectFieldsToBeInvalidAndToHaveAccessibleErrorMessage(fields: Array<string>, feedbackMessage: string) {
  fields.forEach((field) => {
    const inputField = within(screen.getByTestId(`cell-${field}`)).getByRole("textbox");
    expect(inputField).toBeInvalid();
    expect(inputField).toHaveAccessibleErrorMessage(feedbackMessage);
  });
}

export function expectFieldsToHaveIconAndToHaveAccessibleName(fields: Array<string>, accessibleName: string) {
  fields.forEach((field) => {
    const icon = within(screen.getByTestId(`cell-${field}`)).getByRole("img");
    expect(icon).toHaveAccessibleName(accessibleName);
  });
}

export function expectFieldsToBeValidAndToNotHaveAccessibleErrorMessage(fields: Array<string>) {
  fields.forEach((field) => {
    const inputField = within(screen.getByTestId(`cell-${field}`)).getByRole("textbox");
    expect(inputField).toBeValid();
    expect(inputField).not.toHaveAccessibleErrorMessage();
  });
}

export function expectFieldsToNotHaveIcon(fields: Array<string>) {
  fields.forEach((field) => {
    const icon = within(screen.getByTestId(`cell-${field}`)).queryByRole("img");
    expect(icon).toBeNull();
  });
}

export function getCandidateFullNamesFromMockData(politicalGroupMockData: PoliticalGroup): string[] {
  const candidateNames = politicalGroupMockData.candidates.map((candidate) => {
    return candidate.first_name
      ? `${candidate.last_name}, ${candidate.initials} (${candidate.first_name})`
      : `${candidate.last_name}, ${candidate.initials}`;
  });
  return candidateNames;
}

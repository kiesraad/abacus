import { expect } from "vitest";

import { getCandidateFullName } from "@/lib/util";

import {
  ClaimDataEntryResponse,
  PoliticalGroup,
  POLLING_STATION_DATA_ENTRY_CLAIM_REQUEST_PATH,
  PollingStationResults,
} from "@kiesraad/api";
import { overrideOnce, screen, within } from "@kiesraad/test";

import { getClientState } from "../state/dataEntryUtils";
import { FormState } from "../state/types";
import { getInitialValues } from "./mock-data";

export interface OverrideServerClaimDataEntryResponseProps {
  formState: FormState;
  pollingStationResults: Partial<PollingStationResults>;
  acceptWarnings?: boolean;
  continueToNextSection?: boolean;
  progress?: number;
  validationResults?: ClaimDataEntryResponse["validation_results"];
}

export function overrideServerClaimDataEntryResponse({
  formState,
  pollingStationResults,
  acceptWarnings = false,
  continueToNextSection = true,
  validationResults = { errors: [], warnings: [] },
}: OverrideServerClaimDataEntryResponseProps) {
  overrideOnce(
    "post",
    "/api/polling_stations/1/data_entries/1/claim" satisfies POLLING_STATION_DATA_ENTRY_CLAIM_REQUEST_PATH,
    200,
    {
      client_state: getClientState(formState, acceptWarnings, continueToNextSection),
      data: {
        ...getInitialValues(),
        ...pollingStationResults,
      },
      validation_results: validationResults,
    } satisfies ClaimDataEntryResponse,
  );
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
  return politicalGroupMockData.candidates.map((candidate) => {
    return getCandidateFullName(candidate);
  });
}

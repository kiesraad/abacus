import { expect } from "vitest";

import {
  ClaimDataEntryResponse,
  PoliticalGroup,
  POLLING_STATION_DATA_ENTRY_CLAIM_REQUEST_PATH,
  PollingStationResults,
} from "@/api/gen/openapi";
import { getCandidateFullName } from "@/lib/util/candidate";
import { overrideOnce } from "@/testing/server";
import { screen, within } from "@/testing/test-utils";

import { FormState } from "../types/types";
import { getClientState } from "../utils/dataEntryUtils";
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
  continueToNextSection = true,
  validationResults = { errors: [], warnings: [] },
}: OverrideServerClaimDataEntryResponseProps) {
  overrideOnce(
    "post",
    "/api/polling_stations/1/data_entries/1/claim" satisfies POLLING_STATION_DATA_ENTRY_CLAIM_REQUEST_PATH,
    200,
    {
      client_state: getClientState(formState, false, continueToNextSection),
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
  return politicalGroupMockData.candidates.map(getCandidateFullName);
}
